import React from 'react'
import {
    State as State_,
    Store as Store_,
    Route as Route_,
    Link,
    update,
    onUpdate,
    removeUpdateListener,
    useSR1,
    SR1
} from "./index";
import Enzyme, {shallow, mount} from 'enzyme';

import Adapter from 'enzyme-adapter-react-16';

Enzyme.configure({adapter: new Adapter()});


import renderer from "react-test-renderer";

test("throw for accessing globals", () => {
    expect(() => {
        State.get("hi");
        Store.get("hi");
        Route.get("hi");
    }).toThrow();
});

test("throw when writing to singleton objects", () => {
    expect(() => {
        State_.wumbo = 42;
    }).toThrow();
});


test("onUpdate listeners", () => {
    var hasCalled = false;
    function charlotte(){
        hasCalled = true;
    }

    onUpdate(charlotte);
    expect(hasCalled).toBe(false);
    update()
    expect(hasCalled).toBe(true);
    hasCalled = false;
    removeUpdateListener(charlotte);
    update()
    expect(hasCalled).toBe(false);
})

test('setting to Store should update localstorage', () => {
    Store_.set('message', 'hello world')
    expect(JSON.parse(localStorage.__STORE__['default']).message).toBe('hello world')
});



describe('handling state mutations', () => {
    test('set state without path', () => {
        State_.set({
            one: {
                is: {
                    the: {
                        loneliest: 42
                    }
                }
            }
        })
        expect(State_.one.is.the.loneliest).toBe(42)
    })

    test('set value at path', () => {
        State_.set('one', 'is', 'the', 'loneliest', 10)
        expect(State_.one.is.the.loneliest).toBe(10)
    })

    test('set with function argument', () => {
        State_.set('one', 'is', 'the', 'loneliest', x => x + 1)
        expect(State_.one.is.the.loneliest).toBe(11)
    })

    test('get with path', () => {
        State_.set('i', 'met', 'a', {
            'traveller': 'from an antique land'
        })
        expect(State_.get('i', 'met', 'a', 'traveller')).toBe('from an antique land')
    })

    test('set without path or value', () => {
        State_.set()
        expect(State_).toEqual({})    
    })

    test('get without path or value', () => {
        expect(State_.get()).toEqual({})    
    })

    test('update with object', () => {
        State_.set({
            six: 'marshall mcluhan',
            eight: 'enrico fermi'
        })
        State_.update({
            seven: {
                firstName: 'david',
                lastName: 'fincher'
            }
        })
        expect(State_.six).toBe('marshall mcluhan')
        expect(State_.seven.firstName).toBe('david')
    })

    test('update with object', () => {
        expect(() => State_.update('nine', 42)).toThrow()
    })

    test('unset', () => {
        expect(State_.eight).toBe('enrico fermi')
        State_.unset('eight')
        expect(State_.eight).toBe(undefined)
    })
    
})


describe('sr1', () => {
    class App extends React.Component {
        render(){
            // console.log('i has render', State_)
            return <div>{State_.zombocom || 'NOTHING'}</div>
        }
    }

    test('wrapping component', () => {
        let component = mount(<SR1><App /></SR1>)
        expect(component.find('div').text()).toBe('NOTHING')
        State_.set('zombocom', 'THE ONLY LIMIT IS YOURSELF')
        expect(component.find('div').text()).toBe('THE ONLY LIMIT IS YOURSELF')
        component.unmount()
    })


    test('decorator', () => {
        const DecoratedApp = useSR1(App)
        State_.unset('zombocom')
        let component = mount(<DecoratedApp />)
        expect(component.find('div').text()).toBe('NOTHING')
        State_.set('zombocom', 'THE ONLY LIMIT IS YOURSELF')
        expect(component.find('div').text()).toBe('THE ONLY LIMIT IS YOURSELF')
        component.unmount()
    })
    
    // let component = renderer.create(<SR1><App /></SR1>)

})



describe('links', () => {
    // Object.defineProperty(window.location, 'href', {
    //     writable: true,
    //     value: '/about'
    // });

    test('basic links', () => {
        const link = shallow(
            <Link 
                href="/merp/hello"
                className="purple">Facebook</Link>,
        );
        expect(link.prop('href')).toBe('/merp/hello')    
        expect(link.prop('className')).toBe('purple')    
    })


    test('query strings', () => {
        const link = shallow(
            <Link query={{
                yoga: 'mom'
            }}>Facebook</Link>,
        );
        expect(link.prop('href')).toBe('/?yoga=mom')    
    })

    test('hashes strings', () => {
        const link = shallow(
            <Link config={{
                flower: 'power'
            }}>Facebook</Link>,
        );
        expect(link.prop('href')).toBe('/#flower=power')    
    })
    

    test('clicking links', () => {
        let hasClicked = false;
        const link = shallow(
            <Link config={{
                flower: 'power'
            }} onClick={e => {
                hasClicked = true;
            }}>Facebook</Link>,
        );

        expect(hasClicked).toBe(false)
        link.prop('onClick')({
            button: 1
        })
        expect(hasClicked).toBe(true)
    })


    test('clicking link to navigate', () => {
        const link = shallow(
            <Link href="/dog" query={{ breed: 'doge' }}>Facebook</Link>,
        );

        link.prop('onClick')({ button: 0, preventDefault: e => e })
        expect(location.href).toBe('http://localhost:1948/dog?breed=doge')
    })
    
});



describe('routing', () => {
    test('matching', () => {
        Route_.go('/yolo/420')
        expect(location.pathname).toBe('/yolo/420')

        expect(Route_.match('/yolo/:page').page).toBe('420')

        expect(Route_.match('/pollo/:page')).toBe(null)

        expect(Route_.match('/yolo')).toBe(null)

        expect(Route_.match('/yolo', { exact: false })).toBeTruthy()

    })
    
    test('history not implemented', () => {
        expect(() => Route_.history).toThrow()
    })
})