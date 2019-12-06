import React from "react"
import PropTypes from "prop-types"
import {
  isFunction,
  uniqueId,
  isEqual,
  debounce,
  throttle,
} from "underscore"

import {
  clearCachedData,
} from "./utils/cache"
import {
  getFullName,
  createCancellableMethod,
} from "./utils/general"
import {
  hasControllerBeenSeen,
  addControllerSeen,
  removeControllerSeen,
} from "./utils/seen"
import {
  addMounted,
  removeMounted,
  hasBeenMounted,
} from "./utils/mounted"
import {
  processUnloaders,
  addUnloader,
  runUnloaders,
} from "./utils/unloading"
import {
  checkTargetsLoaded,
  startLoading,
} from "./utils/loading"
import {
  checkForFirstLoad,
} from "./utils/counting"

var mounted = 0
var updated = 0

const targetShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  data: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object,
  ]),
  empty: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object,
  ]),
  cached: PropTypes.bool.isRequired,
  //expiration: PropTypes.number.isRequired,
  setter: PropTypes.func.isRequired,
  getter: PropTypes.func.isRequired,
})

const skippedPathnameShape = PropTypes.shape({
  from: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  reverse: PropTypes.bool.isRequired,
})

export class RenderController extends React.Component {
  static propTypes = {
    children: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.node),
      PropTypes.node,
    ]),
    targets: PropTypes.arrayOf(targetShape).isRequired,
    failDelay: PropTypes.number,
    renderFirst: PropTypes.func,
    renderWith: PropTypes.func,
    renderWithout: PropTypes.func,
    lastPathname: PropTypes.string.isRequired,
    currentPathname: PropTypes.string.isRequired,
    skippedPathnames: PropTypes.arrayOf(skippedPathnameShape),
    name: PropTypes.string.isRequired,
    isCacheClearedWhenUnmounted: PropTypes.bool.isRequired
  }

  static defaultProps = {
    children: null,
    skippedPathnames: [],
    renderFirst: null,
    renderWith: null,
    renderWithout: null,
    failDelay: 4000,
    isCacheClearedWhenUnmounted: false,
  }

  constructor(props) {
    super(props)

    // Use some props for the contstructor below...
    const {
      name,
      targets,
      failDelay,
      currentPathname,
      lastPathname,
      skippedPathnames,
    } = props

    // Store a set of canceller functions to run when our debounced load
    // functions should not continue due to unmounting, etc.
    this.cancellers = []

    // Control our setState method with a variable to prevent memroy leaking
    // from our debounced methods running after the components are removed.
    this._isMounted = false
    const realSetState = this.setState.bind(this)
    this.setState = (...args) => {
      if (this._isMounted === false) {
        return
      }
      realSetState(...args)
    }

    // If this component gets re-mounted and it already has empty data, the
    // default state for isControllerSeen will be false, so the loading screen
    // will shopw. To avoid this, we track each mounted component and reset the
    // default state if its already been mounted once.
    //const isControllerSeen = hasControllerBeenSeen(name)
    this.state = {
      isControllerSeen: false,
    }

    // Create a set of methods to remove this controller name from a list of
    // mounted controllers. When this controller is mounted again, it will
    // cancel this removal. Otherwise, following a delay from unmounting, this
    // controllers name will be removed. This allows the renderFirst() method to
    // be shown again. Save these methods to the instance for use elsewhere.
    /*
    const {
      method: unsetControllerSeen,
      canceller: cancelUnsetControllerSeen,
    } = createCancellableMethod((failDelay * 2), () => {
      if (this._isMounted === true && hasBeenMounted(name) === true) {
        return
      }
      removeControllerSeen(name)
    })
    this.cancelUnsetControllerSeen = cancelUnsetControllerSeen
    this.unsetControllerSeen = unsetControllerSeen
    */

    // Save an instance method that adds this controllers name to a list of
    // controllers seen. This prevents the renderFirst() method from displaying
    // again, after the data has already been loaded, but this cmponent gets
    // re-rendered.
    this.setControllerSeen = debounce(() => {
      const { isControllerSeen } = this.state
      if ((this._isMounted === true) && (isControllerSeen === false)) {
        // Toggle the components state to True so our renderFirst() method
        // finished, and is replaced with either renderWith() or
        // renderWithout().
        this.setState({ isControllerSeen: true })
      }
    }, failDelay)
  }

  componentDidMount() {
    const {
      name,
      targets,
    } = this.props

    this._isMounted = true

    // Add this controller to the list of seen controllers.
    this.setControllerSeen()

    // Unload previous data first, then load new data.
    //runUnloaders(lastPathname, currentPathname)
    //processUnloaders(name, targets, lastPathname, currentPathname, skippedPathnames)
    startLoading(name, targets, this.setCanceller)

    // Add this controller to the list of mounted controllers.
    //addMounted(name)

    // Cancel any previous calls to unsetControllerSeen for thi controller.
    //this.cancelUnsetControllerSeen()
  }

  componentDidUpdate(prevProps) {
    const { targets } = this.props

    // After load is attempted, change state to render the correct output.
    this.setControllerSeen()

    // If we have pending loads, and then we navigate away from that controller
    // before the load completes, the data will clear, and then load again.
    // To avoid this, cancel any pending loads everytime our targets change.
    if (isEqual(targets, prevProps.targets) === false) {
      this.runCancellers()
    }
  }

  componentWillUnmount() {
    const {
      name,
      targets,
      lastPathname,
      currentPathname,
      skippedPathnames,
      isCacheClearedWhenUnmounted,
    } = this.props

    // Set our falg to false so setState doesn't work after this.
    this._isMounted = false

    // Before any unmounting, cancel any pending loads.
    this.runCancellers()

    // Remove this controllers name from the list of mounbted controllers so
    // unsetControllerSeen() can run for this controller.
    //const { name } = this.props
    //removeMounted(name)

    // Remove this controllers name from the seen controllers list to allow for
    // renderFirst() methods to work again.
    //this.unsetControllerSeen()
    //

    if (isCacheClearedWhenUnmounted) {
      clearCachedData()
    }
  }

  addUnloaders = () => {
    const {
      name,
      targets,
      lastPathname,
      currentPathname,
      skippedPathnames,
    } = this.props

    targets.forEach(obj => {
      addUnloader({
        lastPathname,
        currentPathname,
        skippedPathnames,
        name: getFullName(name, obj.name),
        handler: () => {
          if (isFunction(obj.unload)) {
            obj.unload()
          }
        },
      })
    })
  }

  setCanceller = (name, fn) => {
    this.cancellers[name] = fn
  }

  runCancellers = () => {
    this.cancellers.forEach(f => {
      if (isFunction(f)) {
        f()
      }
    })
  }

  render() {
    const {
      name,
      targets,
      children,
      renderWithout,
      renderWith,
      renderFirst,
    } = this.props

    const {
      isControllerSeen,
    } = this.state

    if (checkTargetsLoaded(targets) === true) {
      if (isFunction(renderWith)) {
        return renderWith()
      }
      return children
    }

    if (checkForFirstLoad(name, targets) === true) {
      if (isControllerSeen === false) {
        if (isFunction(renderFirst)) {
          return renderFirst()
        }
      }
    }

    if (isFunction(renderWithout)) {
      return renderWithout()
    }
    return null
  }
}

