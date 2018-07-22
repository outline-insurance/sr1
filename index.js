import _ from 'lodash'
import React from 'react'
import queryString from 'query-string'
import deepFreeze from 'deep-freeze'
import pathToRegexp from 'path-to-regexp'
import { resolve as resolveURL, parse as parseURL } from 'url'

// We deduplicate updates to the URL bar which represents view state
// If the URL has changed in the past HISTORY_TIMEOUT milliseconds
// we replaceState (i.e. we consider this current state as a continuation
// of the previous state). Otherwise we pushState.

var HISTORY_TIMEOUT = 2000
var APP_CONTEXT = 'default'

// TODO: think more about the edge cases of the application's state
// what is it before the container is mounted?

var listeners = []
var lastURLUpdate = 0;

// This is the main export for this library. We expect to
// mount a SR1Singleton since we basically use global variables.

export function useSR1(RootComponent) {
    return () => (
        <SR1>
            <RootComponent />
        </SR1>
    )
}

export class SR1 extends React.Component {
    componentDidMount() {
        this._update = e => this.setState({ })
        onUpdate(this._update)
    }
    componentWillUnmount() {
        removeUpdateListener(this._update)
    }
    render() {
        return React.cloneElement(this.props.children)
    }
}

// trigger updates when Store is updated across pages
var storageListener = window.addEventListener('storage', e => {
    if (e.key === APP_CONTEXT) update()
})

var popstateListener = window.addEventListener('popstate', e => {
    update()
})

if(typeof module !== 'undefined' && module.hot) {
    module.hot.dispose(function () {
        window.removeEventListener('storage', storageListener)
        window.removeEventListener('popstate', popstateListener)
    });
}

export function update() {
    coreUpdate()

    for (let cb of listeners) {
        try {
            cb()
        } catch (err) {
            console.error(err)
        }
    }
}

export function onUpdate(fn) {
    listeners.push(fn)
}

export function removeUpdateListener(fn){
    listeners = listeners.filter(k => k !== fn)
}

function match(path, options = {}) {
    const pathname = Route.path
    const { exact = true, strict = false, sensitive = false } = options
    const keys = []
    const re = pathToRegexp(path, keys, { end: exact, strict, sensitive })
    const match = re.exec(pathname)
    if (!match) return null
    const [url, ...values] = match
    return keys.reduce((memo, key, index) => {
        memo[key.name] = values[index]
        return memo
    }, {})
}

function coreUpdate() {
    Route = makeRoute()
    State = makeState()
    Store = makeStore()
}

// This is basically the same Link component that is used
// in Next.JS and React Router.

export class Link extends React.Component {
    render() {
        let viewPatch = {
            query: {},
            config: {},
            ...(this.props.href ? viewFromURL(this.props.href) : {}),
            ...(this.props.view || {}),
        }
        if (this.props.query) Object.assign(viewPatch.query, this.props.query)
        if (this.props.config) Object.assign(viewPatch.config, this.props.config)

        let nextState =
            viewPatch.path === Route.path
                ? {
                      ...Route,
                      ...viewPatch,
                      query: { ...Route.query, ...viewPatch.query },
                      config: { ...Route.config, ...viewPatch.config },
                  }
                : {
                      ...Route,
                      ...viewPatch,
                  }

        let url = viewToURL(nextState)
        return (
            <a
                {..._.omit(this.props, ['query', 'config', 'href', 'view', 'className', 'onClick'])}
                href={url}
                className={
                    (this.props.className || '') + (Route.path === nextState.path ? ' active' : '')
                }
                onClick={e => {
                    if (this.props.onClick) this.props.onClick(e)
                    if (
                        e.button === 0 &&
                        !e.metaKey &&
                        !e.shiftKey &&
                        !e.ctrlKey &&
                        !e.defaultPrevented
                    ) {
                        e.preventDefault()
                        Route.go(url, this.props.view || {})
                    }
                }}>
                {this.props.children}
            </a>
        )
    }
}

const isObjectEmpty = x => Object.getOwnPropertyNames(x || {}).length === 0

// compose a URL out of a view object
function viewToURL(obj) {
    let path = obj.path || '/',
        search = isObjectEmpty(obj.query) ? '' : '?' + queryString.stringify(obj.query),
        hash = isObjectEmpty(obj.config) ? '' : '#' + queryString.stringify(obj.config)
    return path + search + hash
}

function viewFromURL(url = null) {
    let loc = location
    if (url) {
        loc = parseURL(resolveURL(location.href, url))
    }
    return {
        path: loc.pathname || '/',
        // For some reason queryString.parse returns an object
        // without the object prototype.

        // https://github.com/hapijs/hapi/issues/3280
        // https://github.com/nodejs/node/pull/6289/files
        query: { ...queryString.parse(loc.search) },
        config: { ...queryString.parse(loc.hash) },
    }
}

const SR1Prototype = {
    update(...args) {
        let value = args[args.length - 1]
        if (!_.isObject(value))
            throw new Error('::update must not be called with non-object. Use ::set instead.')
        let path = args.slice(0, -1)

        for (let key in value) {
            if (!value.hasOwnProperty(key)) continue
            this.set(...path, key, value[key])
        }
        // this.set(...path, { ...getPath(this, path), ...value })
    },
    get(...args) {
        return getPath(this, args)
    },
    unset(...path) {
        this.set(_.omit({ ...this }, [path]))
    },
    set(...args) {
        let value = args[args.length - 1]
        if (value === undefined) value = {}
        let path = args.slice(0, -1)

        if (typeof value === 'function') value = value(getPath(this, path))

        let newState = replacePath(this, path, value)
        this._set(newState)
    },
}

const RouteConstructor = function Route() {}
RouteConstructor.prototype = {
    _set(newState) {
        // TODO: consider filtering obj to remove path, query, config
        let url = viewToURL(newState)
        let desc = newState.desc || ''

        // only ever do push state if the url changes
        // and if we have had at least HISTORY_TIMEOUT since the last update
        if (
            Date.now() - lastURLUpdate > HISTORY_TIMEOUT &&
            url !== location.pathname + location.search + location.hash
        ) {
            history.pushState(newState, desc, url)
        } else {
            history.replaceState(newState, desc, url)
        }
        lastURLUpdate = Date.now()
        update()
    },
    go(href = '/', obj = {}) {
        // TODO: detect if being called from .render
        // and defer execution

        let view = viewFromURL(href)

        // Route.go should always pushState instead of replaceState
        lastURLUpdate = 0;
        if (view.path === location.pathname) {
            this.update({ ...view, ...obj })
        } else {
            this.set({ ...view, ...obj })
        }
        return null
    },
    match(path, options = {}) {
        return match(path, options)
    },
    get history() {
        throw new Error('history not yet implemented')
    },
}
Object.assign(RouteConstructor.prototype, SR1Prototype)
RouteConstructor.prototype.fn = RouteConstructor.prototype

function makeRoute() {
    let view = new RouteConstructor()
    Object.assign(view, { ...history.state, ...viewFromURL() })
    return deepFreeze(view)
}

// function _replacePath(obj, path, value){
//     if(path.length === 0) return value;
//     // if the head of the path is a number, create an array
//     // if it doesnt already exist
//     let clone = obj === undefined ?
//         ((typeof path[0] === 'number') ? [] : {}) : _.clone(obj);
//     clone[path[0]] = replacePath(clone[path[0]], path.slice(1), value)
//     return clone;
// }

// function _getPath(obj, path){
//     if(path.length === 0) return obj;
//     return getPath(obj[path[0]] || {}, path.slice(1))
// }

function replacePath(obj, path, value) {
    if (path.length === 0) return value
    return _.setWith(_.clone(obj), path, value, _.clone)
}

function getPath(obj, path) {
    if (path.length === 0) return obj
    return _.get(obj, path)
}

let appState = {}

const StateConstructor = function State() {}
Object.assign(StateConstructor.prototype, SR1Prototype, {
    _set(newState) {
        appState = newState
        update()
    },
})
StateConstructor.prototype.fn = StateConstructor.prototype

function makeState() {
    let state = new StateConstructor()
    Object.assign(state, appState)
    return deepFreeze(state)
}

const StoreConstructor = function Store() {}
StoreConstructor.prototype = {
    _set(newStore) {
        localStorage[APP_CONTEXT] = JSON.stringify(newStore)
        update()
    },
}
Object.assign(StoreConstructor.prototype, SR1Prototype)
StoreConstructor.prototype.fn = StoreConstructor.prototype
function makeStore() {
    let store = new StoreConstructor()
    let appStore = {}
    try {
        appStore = JSON.parse(localStorage[APP_CONTEXT]) || {}
    } catch (err) {
        // ignore errors
    }
    Object.assign(store, appStore)
    return deepFreeze(store)
}

// clear history state if refreshing
// if(window.performance){
//     if(window.performance.navigation.type === 1){
//         history.replaceState({}, '', location.href)
//     }
// }


export var Route = makeRoute()
export var Store = makeStore()
export var State = makeState()

function ensureWebConsole() {
    if(new Error().stack.indexOf('<anonymous>:') == -1){
        throw new Error(
            'State and Route globals can only be used from web console.' +
            'You probably forgot to import { State, Route } from "sr1" ')
    }
}

function exposeGlobal(name, getter) {
    if(Object.defineProperty) Object.defineProperty(global, name, {
        get: function() {
            ensureWebConsole()
            return getter()
        },
        configurable: true,
    })
}

if (Object.defineProperty) {
    exposeGlobal('Store', () => Store)
    exposeGlobal('State', () => State)
    exposeGlobal('Route', () => Route)
}
