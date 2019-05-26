You can compose these together like so

```javascript
const baseConfig = require('reactive-items-dev-config/babel.config-base');
const reactConfig = require('reactive-items-dev-config/babel.config-react');

module.exports = {
  presets: [
    ...reactConfig.presets || [],
    ...baseConfig.presets || [],
  ],
  plugins: [
    ...reactConfig.plugins || [],
    ...baseConfig.plugins || [],
  ]
};
```

Note order matters.  React stuff first due to some order specific dependencies
