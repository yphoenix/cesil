# cesil
CESIL Language Interpreter in JavaScript

## Install
You need node, which you can get from: https://nodejs.org/

### Globally
```
npm install -g cesil
```
### Run (globally)
```
cesil file.ces
```

### Locally
```
npm install cesil
```
### Run (locally)
```
npm run cesil file.ces

// or

node src/cesilCLI.js file.ces
```

## Language information

https://en.wikipedia.org/wiki/CESIL

### Extensions

This implementation of CESIL supports

1. The subroutine instructions `JSR LABEL` and `RET`
2. Positive numbers do not need a `+` sign, if it looks like a number, it is treated as such
3. Comment lines can start with a `*`

### Example files

Can be found in the examples folder or at: https://github.com/yphoenix/cesil/tree/main/examples
