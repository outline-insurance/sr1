# State Route 1

A scenic, All-American framework for state management and routing in React

![State Route 1](https://upload.wikimedia.org/wikipedia/commons/5/57/Pacific_Coast_Highway_Laguna_Beach.jpg)


## Design

SR1 exports three singleton objects: `State`, `Store`, and `Route`. You can use them from any module that imports SR1. 

Between them lies all the global state for your application: `State` for transient information, `Store` for persistent information, and `Route` for information found in your URL bar.

All members of this triumvirate fundamentally behave in the same way: 

- You can treat them as plain objects, read their properties (and their properties's properties)
- You can call `.set(...path, value)` to replace a value at a particular path
- You can call `.update(...path, value)` to merge an object into the entry at a particular path
- You can call `.get(...path)` to retrieve a value at the path

Any time any of these state containers is updated, all React components get re-rendered. 

One of the cooler ideas in SR1 is that information in your URL bar and history navigation buttons can also be handled in the same way. The path component of the URL is dumped into the special key `Route.path`, and parts of the query string are automatically parsed into `Route.query`. 

## State Management

By accessing the `State` singleton, we can manage the state of the page. Think of `State` as a big object variable associated with the page which can be updated with `set` and `update` methods. 

```js
import { State } from 'sr1'

function App(){
    return <div>
        Number of times this button has been pushed: {State.count || 0}
        <button onClick={e => {
            State.set('count', x => (x || 0) + 1)
        }}>Increment me!</button>
    </div>
}
```


## Routing

In SR-1, we handle routes with plain `if` statements, the way nature intended. 

```js
import { Route, Link } from 'sr1'

function App(){
    let m;
    if(Route.path == '/about'){
        return <div>
            The Pocket Monster appreciation society has dozens of members
            since its first meeting in 1998.
        </div>
    }else if(m = Route.match('/pokemon/:name')){
        return <div>
            {m.name} is one of my favorite pokemon!
        </div>
    }else{
        return <div>
            Check out our <Link href="/pokemon/bulbasaur">Bulbasaurs!</Link>
        </div>            
    }
}
```

The `Route` object, which can be imported from any file exposes information about the current page's URL. 

- `Route.path` is the base path of the url (including a leading path)
- `Route.query` is an object which contains the decoded URL parameters (e.g. `?this=that&more=stuff`)
- `Route.config` is an object that contains the decoded URL hash (e.g. `#merp=cola&derp=flerp`)
- `Route.*` is additional hidden state information which can be navigated with the browser's history navigation

In addition, there are a few methods on the `Route` object

- `Route.go(href, additionalState={})` which can be used to programmatically redirect
- `Route.update` which can be used to update parts of the page state
    - `Route.update({ path: '/home' })` can be used to navigate to a page (preserving query string info)
    - `Route.update({ query: { merp: 'yolo' } })` changes the query string to include `?merp=yolo`
    - `Route.update('query', 'merp', 'yolo')` does the same thing as the above
- `Route.set` which can be used to programmatically replace the entire page view state. it has the same API as `update`

The `Route.match` method lets you quickly do pattern matching on page routes. The first argument is a pattern.

## Mounting

For all of this stuff to work you'll need to wrap your root application node with `<SR1>` tags so it knows what to render when things change. 

```js
import { SR1 } from 'sr1'
ReactDOM.render(<SR1><App /></SR1>, root);
```

## Utilities

SR1 automatically exposes `State`, `Route`, and `Store` as globals accessible in your browser's web console. This way you can easily fiddle around with your application's state. 

Accidentally referring to them from within your code throws an error with a friendly reminder to mind your imports. 


