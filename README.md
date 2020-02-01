# RenderController

Renders a component after its data has been loaded. Expects the use of
[@alexseitsinger/redux-locations](https://github.com/alexseitsinger/redux-locations).

## Installation

```
yarn add @alexseitsinger/react-render-controller
```

## Props

__Name__         | __Purpose__                                                                                 | __Required__ | __Default__
---              | ---                                                                                         | ---          | ---
targets          | An array of target objects                                                                  | Yes          | null
renderFirst      | The function used to render output before the data loading is attempted                     | No           | null
renderWith       | The function used to render the output once the data has been loaded                        | No           | null
renderWithout    | The function used to render the output when data loading failed to produce non-empty result | No           | null
skippedPathnames | An array of objects that unloading should be skipped for.                                   | No           | []

#### Shapes

###### Target

```javascript
{
  name: String,
  data: Array|Object,
  getter: Function,
  setter: Function,
  empty: Object|Array,
  cached: Boolean,
}
```

###### Skipped Pathname

```javascript
{
  from: String,
  to: String,
  reverse: Boolean,
}
```

## Example

In app root

```javascript
import { RenderControllerProvider } from "@alexseitsinger/react-render-controller"

const App = ({ store, routerHistory }) => (
  <RenderControllerProvider
    onRenderFirst={() => <LoadingScreen />}
    onRenderWithout={() => <FailedScreen />}
    getPathnames={() => {
      const state = store.getState()
      const { current, last } = state.locations
      return {
        lastPathname: last.pathname,
        currentPathname: currentPathname,
      }
    }}>
    <Provider store={store}>
      <ConnectedRouter history={routerHistory}>
        <Route path={"/"} exact component={IndexPage} />
      </ConnectedRouter>
    </Provider>
  </RenderControllerProvider>
)
```

Within a page component

```javascript
import { RenderController } from "@alexseitsinger/react-render-controler"

const HomePage = ({
  dates,
  getDates,
  setDates,
}) => (
  <RenderController
    targets={[
      {
        name: "dates",
        data: dates,
        getter: getDates,
        setter: setDates,
        empty: {},
        cached: true,
      },
    ]}
    skippedPathnames={[
      {
        from: "/",
        to: "/about",
        reverse: true,
      },
    ]}
    renderWith={() => (
      <div>
        {Object.keys(dates).map(key => (
          <div key={"fdsfsd"}>{key}</div>
        ))}
      </div>
    )}
  />
)
```
