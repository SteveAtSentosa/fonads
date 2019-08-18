module.exports = {
  presets: [
    // [ "@babel/preset-env", { useBuiltIns: "usage" } ]
    // "@babel/preset-env"
    [
      "@babel/preset-env", {
        "targets": {
          "node": "current"
        }
      }
    ]
  ],
  env: {
    debug: {
      sourceMap: "inline",
      retainLines: true
    }
  }
};
