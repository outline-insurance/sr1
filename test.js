import { State as State_, Store as Store_, Route as Route_ } from './index'


test('throw for accessing globals', () => {
  expect(() => {
    State.get('hi')
    Store.get('hi')
    Route.get('hi')
  }).toThrow()
});