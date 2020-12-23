# RsRe-Wasm

This package is a (currently very minimal) wrapper around the rust crate `regex` through WebAssembly in JavaScript.
The main goal is to provide a safe regex without using node-gyp.
You can use it in both Node and the Browser (assuming the platform supports WebAssembly).
There's no glue-code for the Browser at the moment.

The naming isn't final as it's confusing.

## Example 
```typescript
import { RsReWasm } from 'rsre-wasm';

const regex = new RsReWasm(/(?<year>\d+)-(?<month>\d+)-(?<day>\d+)/g);
const string = "Foo happened on 2020-03-02 and bar happened on 2020-04-10.";
for (const { groups } of string.matchAll(regex)) {
    console.log(groups);
}

// Logs:
//
// { day: "02", month: "03", year: "2020" }
// { day: "10", month: "04", year: "2020" }
```

### Building

```
node build.node.mjs
```

### Publish to NPM with `wasm-pack publish`

```
wasm-pack publish
```

### Known Issues

* The constructor throws strings as errors
* Naming is confusing
* Rust code is not checked (probably copying many things unnecessarily)
