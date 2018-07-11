# State Route 1

A scenic, All-American framework for state management and routing in React

## Routing

In SR-1, we handle routes with plain `if` statements, the way nature intended. 

```js
    import { Route, Link } from 'sr1'

    function App(){
        let m;
        if(Route.path == '/about'){
            return <div>
                This community, the Pocket Monster Museum was founded in 1998. 
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

## Mounting

```js
    import { SR1 } from 'sr1'
    ReactDOM.render(<SR1><App /></SR1>, root);
```