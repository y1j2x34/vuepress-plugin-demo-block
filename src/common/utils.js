import { DEFAULT_SETTINGS, SETTINGS_KEY } from './constants'

const _once = {}

const getHtmlTpl = html => `<div id="app">
${html}
</div>`

const getVueJsTpl = js => {
  const jsContent = js
    .replace(/export\s+default\s*?\{\n*/, '')
    .replace(/\n*\}\s*$/, '')
    .trim()
  return `new Vue({
  el: '#app',
  ${jsContent}
})`
}

const toArray = value => Array.prototype.slice.call(value)

export const getSettings = key =>
  window[SETTINGS_KEY] && window[SETTINGS_KEY][key] !== undefined
    ? window[SETTINGS_KEY][key]
    : DEFAULT_SETTINGS[key]

export const h = (tag, attrs, children) => {
  const node = document.createElement(tag)
  attrs &&
    Object.keys(attrs).forEach(key => {
      if (!key.indexOf('data')) {
        const k = key.replace('data', '')
        node.dataset[k] = attrs[key]
      } else {
        node[key] = attrs[key]
      }
    })
  children &&
    children.forEach(({ tag, attrs, children }) => {
      node.appendChild(h(tag, attrs, children))
    })
  return node
}

export const $ = (parent, node, returnArray) => {
  const result = toArray(parent.querySelectorAll(`.${node}`))
  return result.length === 1 && !returnArray ? result[0] : result
}

const getVueScript = (js, html) => {
  const scripts = js.split(/export\s+default/)
  const scriptStrOrg = `(function() {${scripts[0]} ; return ${scripts[1]}})()`
  const scriptStr = window.Babel
    ? window.Babel.transform(scriptStrOrg, { presets: ['es2015'] }).code
    : scriptStrOrg
  const scriptObj = [eval][0](scriptStr)
  scriptObj.template = html
  return scriptObj
}

const getVanillaScript = js => {
  return window.Babel
    ? window.Babel.transform(js, { presets: ['es2015'] }).code
    : js
}

export const getVueDetail = (code, config) => {
  const cssBlock = code.match(/<style>([\s\S]+)<\/style>/)
  const htmlBlock = code.match(/<template>([\s\S]+)<\/template>/)
  const jsBlock = code.match(/<script>([\s\S]+)<\/script>/)
  const result = {
    css: cssBlock && cssBlock[1].replace(/^\n|\n$/g, ''),
    html: htmlBlock && htmlBlock[1].replace(/^\n|\n$/g, ''),
    js: jsBlock && jsBlock[1].replace(/^\n|\n$/g, ''),
    jsLib: config.jsLib || [],
    cssLib: config.cssLib || []
  }
  result.htmlTpl = getHtmlTpl(result.html)
  result.jsTpl = getVueJsTpl(result.js)
  result.script = getVueScript(result.js, result.html)
  const vueResource = getSettings('vue')
  result.jsLib.unshift(vueResource)
  return result
}

export const getVanillaDetail = (code, config) => {
  const cssBlock = code.match(/<style>([\s\S]+)<\/style>/)
  const htmlBlock = code.match(/<html>([\s\S]+)<\/html>/)
  const jsBlock = code.match(/<script>([\s\S]+)<\/script>/)
  const result = {
    css: cssBlock && cssBlock[1].replace(/^\n|\n$/g, ''),
    html: htmlBlock && htmlBlock[1].replace(/^\n|\n$/g, ''),
    js: jsBlock && jsBlock[1].replace(/^\n|\n$/g, ''),
    jsLib: config.jsLib || [],
    cssLib: config.cssLib || []
  }
  result.htmlTpl = result.html
  result.jsTpl = result.js
  result.script = getVanillaScript(result.js)
  return result
}

const getReactTpl = code => {
  code = code
    .replace('export default ', '')
    .replace(/App\.__style__(\s*)=(\s*)`([\s\S]*)?`/, '')
  code +=
    'ReactDOM.render(React.createElement(App), document.getElementById("app"))'
  return code
}

export const getReactDetail = (code, config) => {
  const transform = window.Babel.transform
  const ins = transform(code, { presets: ['es2015', 'react'] }).code
  const script = `(function(exports){var module={};module.exports=exports;${ins};return module.exports.__esModule?module.exports.default:module.exports;})({})`
  const scriptObj = new Function(`return ${script}`)()

  const result = {
    js: scriptObj,
    css: scriptObj.__style__ || '',
    jsLib: config.jsLib || [],
    cssLib: config.cssLib || [],
    jsTpl: getReactTpl(code),
    htmlTpl: getHtmlTpl('')
  }

  const reactResource = getSettings('react')
  const reactDOMResource = getSettings('reactDOM')
  result.jsLib.unshift(reactResource, reactDOMResource)

  return result
}

export const injectCss = (css) => {
  if (_once[css]) return
  injectCssInto(css, document.body);
  _once[css] = true
}

export const injectCssInto = (css, dom = document.head) => {
  const style = h('style', { innerHTML: css })
  dom.appendChild(style)
}

export const injectCssList = (cssURLList, target = document.head) => {
  if(!Array.isArray(cssURLList)) {
    return;
  }
  cssURLList.forEach(src => {
    const link = h('link', { type: 'text/css', rel:"stylesheet", href: src });
    target.appendChild(link);
  });
}

export const injectJSList = (jsURLList, target = document.head) => {
  if(!Array.isArray(jsURLList)) {
    return;
  }
  const promises = jsURLList.map(src => {
    const script = h('script', { type: "application/javascript", src });
    return new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      target.appendChild(script);
    });
  });
  return Promise.all(promises);
}

export const noop = () => undefined
