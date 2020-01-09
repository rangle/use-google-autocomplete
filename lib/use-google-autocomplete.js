"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var uuid4 = require("uuid/v4");
var initialState = {
    results: {
        predictions: [],
        status: '',
    },
    isLoading: false,
    error: null,
};
var cors = process.env.NODE_ENV !== 'production'
    ? 'https://cors-anywhere.herokuapp.com/'
    : '';
function useGoogleAutocomplete(_a) {
    var apiKey = _a.apiKey, query = _a.query, _b = _a.type, type = _b === void 0 ? 'places' : _b, _c = _a.debounceMs, debounceMs = _c === void 0 ? 400 : _c, _d = _a.options, options = _d === void 0 ? {} : _d;
    var _e = React.useReducer(reducer, initialState), state = _e[0], dispatch = _e[1];
    var sessionToken = React.useRef(uuid4());
    var sessionTokenTimeout = React.useRef();
    var abortController = React.useRef();
    var abortSignal = React.useRef();
    var placesAbortController = React.useRef();
    var placesAbortSignal = React.useRef();
    React.useEffect(function () {
        sessionTokenTimeout.current = window.setInterval(resetSessionToken, 180000);
        abortController.current = new AbortController();
        abortSignal.current = abortController.current.signal;
        placesAbortController.current = new AbortController();
        placesAbortSignal.current = placesAbortController.current.signal;
        placesAbortController.current;
        return function () {
            clearInterval(sessionTokenTimeout.current);
            abortController.current.abort();
            placesAbortController.current.abort();
        };
    }, []);
    var initialRender = React.useRef(false);
    var debouncedFn = React.useRef();
    React.useEffect(function () {
        if (initialRender.current === false) {
            initialRender.current = true;
            return;
        }
        if (debouncedFn.current)
            debouncedFn.current.clear();
        if (query.length === 0) {
            dispatch({
                type: 'INVALID_REQUEST',
            });
            return;
        }
        if (!state.isLoading && !abortController.current.signal.aborted) {
            dispatch({
                type: 'LOADING',
            });
        }
        debouncedFn.current = debounce(function () {
            var types = options.types && type === 'places' ? "&types=" + options.types : '';
            var strictbounds = options.strictbounds && types === 'places' ? "&strictbounds" : '';
            var offset = options.offset && type === 'query' ? "&offset=" + options.offset : '';
            var language = options.language ? "&language=" + options.language : '';
            var location = options.location ? "&location=" + options.location : '';
            var radius = options.radius ? "&radius=" + options.radius : '';
            var components = options.components
                ? "&components=" + options.components
                : '';
            var url = cors + "https://maps.googleapis.com/maps/api/place/autocomplete/json?input=" + query + types + language + location + radius + strictbounds + offset + components + "&key=" + apiKey + "&sessiontoken=" + sessionToken.current;
            fetch(url, { signal: abortSignal.current })
                .then(function (data) { return data.json(); })
                .then(function (data) {
                dispatch({
                    type: data.status,
                    payload: {
                        data: data,
                    },
                });
            })
                .catch(function () {
                if (abortController.current.signal.aborted) {
                    abortController.current = new AbortController();
                    abortSignal.current = abortController.current.signal;
                }
            });
        }, debounceMs);
        debouncedFn.current();
    }, [
        query,
        debounceMs,
        apiKey,
        options.types,
        options.language,
        options.location,
        options.radius,
        options.strictbounds,
        options.offset,
        type,
    ]);
    var getPlaceDetails = function (placeId, placeDetailOptions) {
        if (placeDetailOptions === void 0) { placeDetailOptions = {}; }
        return new Promise(function (resolve) {
            var fields = placeDetailOptions.fields
                ? "&fields=" + placeDetailOptions.fields.join(',')
                : '';
            var region = placeDetailOptions.region
                ? "&region=" + placeDetailOptions.region
                : '';
            var language = placeDetailOptions.language
                ? "&language=" + placeDetailOptions.language
                : options.language
                    ? "&language=" + options.language + "}"
                    : '';
            var url = cors + "https://maps.googleapis.com/maps/api/place/details/json?placeid=" + placeId + fields + region + language + "&key=" + apiKey + "&sessiontoken=" + sessionToken.current;
            fetch(url, { signal: placesAbortSignal.current })
                .then(function (data) { return data.json(); })
                .then(function (data) {
                resetSessionToken();
                resolve(data);
            })
                .catch(function () {
            });
        });
    };
    var resetSessionToken = function () {
        sessionToken.current = uuid4();
    };
    var cancelQuery = function (prediction) {
        if (abortController.current)
            abortController.current.abort();
        dispatch({
            type: 'OK',
            payload: {
                data: {
                    predictions: [prediction],
                },
            },
        });
    };
    return {
        results: state.results,
        isLoading: state.isLoading,
        error: state.error,
        getPlaceDetails: getPlaceDetails,
        cancelQuery: cancelQuery,
    };
}
exports.default = useGoogleAutocomplete;
var reducer = function (state, action) {
    switch (action.type) {
        case 'LOADING':
            return __assign(__assign({}, state), { isLoading: true });
        case 'OK':
            return __assign(__assign({}, state), { results: action.payload.data, isLoading: false, error: null });
        case 'ZERO_RESULTS':
            return __assign(__assign({}, state), { results: {
                    predictions: [],
                }, isLoading: false, error: "No results \u2014 try another input." });
        case 'INVALID_REQUEST':
            return __assign(__assign({}, state), { isLoading: false, error: null });
        case 'REQUEST_DENIED':
            return __assign(__assign({}, state), { isLoading: false, error: "Invalid 'key' parameter." });
        case 'UNKNOWN_ERROR':
            return __assign(__assign({}, state), { isLoading: false, error: "Unknown error, refresh and try again." });
        default:
            return state;
    }
};
function debounce(func, wait, immediate) {
    var timeout;
    var executedFunction = function () {
        var context = this;
        var args = arguments;
        var later = function () {
            timeout = null;
            if (!immediate)
                func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow)
            func.apply(context, args);
    };
    executedFunction.clear = function () {
        clearTimeout(timeout);
        timeout = null;
    };
    return executedFunction;
}
//# sourceMappingURL=use-google-autocomplete.js.map