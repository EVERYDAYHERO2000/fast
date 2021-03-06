(() => {
  const COMPONENTS = {};
  const Fast = (window.Fast = {
    components: COMPONENTS,
    config: {
      /** Символ компонента */
      tagSign: ':',
      /** Директория с компонентами */
      componentsDirectory: 'src/components',
      /** Данные которые можно использовать из компонента */
      dataset: {},
      /** Псевдонимы */
      aliases: [
        { '@root': '' },
        { '@components': 'Fast.config.componentsDirectory' },
        {
          '@component': '${Fast.config.componentsDirectory}/${componentName}/assets'
        }
      ],
      /** Расширение файлов компонента */
      componentsExtension: 'html',
      /** Предзагрузка компонентов */
      components: [],
      /** Глобальные css правила */
      css: ''
    },
    init: init,
    findComponents: findComponents,
    installComponent: installComponent,
    parseTemplate: parseTemplate,
    checkProp: checkProp
  });

  let CONFIG = Fast.config;

  /**
   * Класс компонента
   */
  class Component {
    constructor(fn) {
      this.props = fn.props || {};
      this.template =
        fn.template ||
        function (e) {
          return false;
        };
      this.methods = fn.methods || {};
      this.name = fn.name || '';
      this.mounted =
        fn.mounted ||
        function (e) {
          return false;
        };
      this.created =
        fn.created ||
        function (e) {
          return false;
        };
      this.path = fn.path || '';
      this.instances = fn.instances || [];
      this.style = fn.style || '';
      return this;
    }

    render(props) {
  
      const newInstance = this.template(props);
      const $conteiner = document.createElement('div');
      $conteiner.innerHTML = newInstance.template;

      const $instance = $conteiner.children[0];
      return {
        instance : $instance,
        methods : newInstance.methods,
        props : newInstance.props  
      }
    }
  }

  /**
   * Инициализация `Fast`.
   * @param {Object} config - конфиг
   * @param {NodeList} $entryElem - узел, точка входа
   * @param {Function} callback - колбек
   */
  function init(config, $entryElem, callback) {
    $entryElem = $entryElem || document.body;
    Fast.config = { ...CONFIG, ...config };
    CONFIG = Fast.config;

    addStyles(CONFIG.css + '.fast-inited {opacity: 0;}');

    $entryElem.classList.add('fast-inited');

    loadComponents(CONFIG.components, (result) => {
      installMultipleComponents(result);
      findComponents($entryElem, ($elem) => {
        if (callback) callback($elem);

        /** нужно починить */
        setTimeout(() => $entryElem.classList.remove('fast-inited'), 500);
      });
    });
  }

  /**
   * Проверить все элементы в узле.
   *
   * @param {HTMLElement} $entryElem - узел, точка входа
   * @param {Function} callback - колбек
   */
  function findComponents($entryElem, callback) {
    /** Найти все неустановленные компоненты в пределах узла. */
    const needToInstall = (($entryElem) => {
      const arr = [];

      if ($entryElem.tagName)
        selectAllNode($entryElem, '*').forEach(($elem) => {
          if (tagNameIsComponent($elem.tagName)) {
            const name = getComponentName($elem.tagName);
            if (!isInstalled(name) && !arr.includes(name)) arr.push(name);
          }
        });
      return arr;
    })($entryElem);

    loadComponents(needToInstall, (result) => {
      installMultipleComponents(result);

      search($entryElem);

      if (callback) callback($entryElem);
    });

    /**
     * Рекурсивная функция, ищет компоненты в глубину элемента.
     *
     * @param {HTMLElement} $entryElem — узел входа
     */
    function search($entryElem) {
      /** является узлом */
      if ($entryElem.tagName) {
        const tagName = $entryElem.tagName;

        /** компонент */
        if (tagNameIsComponent(tagName)) {
          const name = getComponentName(tagName);

          /** если установлен */
          if (isInstalled(name)) {
            renderComponent($entryElem, name);
          }

          /** узел */
        } else {
          /** если не скрипт и не стиль */
          if (!['SCRIPT', 'STYLE', 'TEMPLATE'].includes($entryElem.tagName)) {
            /** продолжить поиск в глубину */
            if ($entryElem.childNodes.length) {
              $entryElem.childNodes.forEach(($elem) => {
                search($elem);
              });
            }
          }
        }

        /** что-то другое */
      } else {
      }
    }
  }

  

  /**
   * Загрузить компоненты из файлов.
   *
   * @param {Array} components - массив строк с названиями компонентов
   * @param {Function} callback - колбек
   */
  function loadComponents(components, callback) {
    const list = [];
    const results = [];

    components.forEach((componentName, i) => {
      list.push(
        fetch(
          `${CONFIG.componentsDirectory}/${componentName}/${componentName}.${CONFIG.componentsExtension}`
        )
          .then((response) => {
            return response.text();
          })
          .then((context) => {
            results[i] = {
              context: context,
              name: componentName
            };
          })
      );
    });

    Promise.all(list).then(() => callback(results));
  }

  /**
   * Разбирает строку компонента и возвращает 3 строки (шаблон, скрипт, стили).
   *
   * @param {String} context - строчное представление файла компонента
   * @param {String} componentName - имя компонента
   */
  function parseTemplate(context, componentName) {

    let stringTemplate, stringScript, stringStyle;

    context
      .replace(
        /<template\b[^>]*>([\s\S]*?)<\/template>/gmi,
        (a, b) => (stringTemplate = b)
      )
      .replace(
        /<script\b[^>]*>([\s\S]*?)<\/script>/gmi, 
        (a, b) => (stringScript = b)
      )
      .replace(
        /<style\b[^>]*>([\s\S]*?)<\/style>/gmi, 
        (a, b) => (stringStyle = b)
      );

    return {
      stringTemplate: cookTemplate(stringTemplate, componentName),
      stringScript: cookScript(stringScript, componentName),
      stringStyle: cookStyle(stringStyle, componentName)
    };
  }

  /**
   * Оброботка строки шаблона html.
   *
   * @param {String} fragment - строка шаблона html
   * @param {String} componentName - имя компонента
   */
  function cookTemplate(fragment, componentName) {
    fragment = replaceAlias(fragment, componentName);

    /**
     * Интерполяция названий методов в инлайновых обработчиках событий
     * пример onclick="${onClick}" => onclick="onClick"
     * методы событий крепятся к экземпляру компонента на этапе создания экземпляра
     * */
    fragment = fragment.replace(
      /on([a-z]+)=['"]?\$\{([\w\d_]+)\}['"]?/gi,
      (e, a, b) => `on${a}="${b}"`);

    return fragment;
  }

  /**
   * Оброботка строки шаблона style
   *
   * @param {String} fragment - строка шаблона style
   * @param {String} componentName - имя компонента
   */
  function cookStyle(fragment, componentName) {
    fragment = replaceAlias(fragment, componentName);

    fragment = fragment.trim().replace(/ +(?= )/g, '');

    return fragment;
  }

  /**
   * Оброботка строки шаблона script
   *
   * @param {String} fragment - строка шаблона script
   * @param {String} componentName - имя компонента
   */
  function cookScript(fragment, componentName) {
    fragment = fragment.trim();
    fragment = fragment.length ? fragment : '({})';
    fragment = replaceAlias(fragment, componentName);

    return fragment;
  }

  /**
   * Заменить вхождения подстроки на значение псевдонима.
   *
   * @param {String} string - строка шаблона для поиска и замены вхождений на псевдонимы
   * @param {String} componentName - имя компонента
   */
  function replaceAlias(string, componentName) {
    CONFIG.aliases.forEach((e) => {
      const name = Object.keys(e)[0];
      const value = new Function('componentName', `return \`${e[name]}\``)(
        componentName
      );

      string = string.replaceAll(name, value);
    });
    return string;
  }

  /**
   * Добавляет правила css.
   *
   * @param {String} cssRules - строка с css
   */
  function addStyles(cssRules) {
    let $fastStyles = selectNode(document, '#fast-styles');
    if (!$fastStyles) {
      $fastStyles = document.createElement('style');
      $fastStyles.setAttribute('id', 'fast-styles');
      document.head.append($fastStyles);
    }

    if (window.Sass) {
      Sass.compile(cssRules, (result) => {
        $fastStyles.textContent += result.text ? `${result.text}\n` : '';
      });
    } else {
      $fastStyles.textContent += `${cssRules}\n`;
    }

    return $fastStyles.textContent;
  }

  /**
   * Установка нескольких компонентов.
   *
   * @param {Array} series - массив загруженных данных для установки компонентов
   */
  function installMultipleComponents(series, callback) {
    series.forEach((s) => {
      if (!isInstalled(s.name))
        installComponent(s.context, s.name, (component) => {
          if (callback) callback(component);
        });
    });
  }

  /**
   * Инсталировать компонент в `COMPONENTS[componentName]`.
   *
   * @param {String} context - строка, содержимое файла компонента
   * @param {String} componentName - название компонента
   */
  function installComponent(context, componentName, callback) {

    const { stringTemplate, stringScript, stringStyle } = parseTemplate(
      context,
      componentName
    );

    const js = new Function(`return ${stringScript}`)();

    const template = ((js, stringTemplate) => {
      const methods = js.methods || [];
      const props = js.props || [];

      /** Интерполяция методов компонента */
      let fnsName = '';
      const fns = ((methods) => {
        return Object.keys(methods)
          .map((f) => {
            fnsName += `${f}:${f},`;
            return `const ${f} = ${methods[f]};\n`;
          })
          .join('');
      })(methods);

      const dataset = `const dataset = Fast.config.dataset;\n`;

      const cp = `const checkProp = Fast.checkProp;\n`;

      /** Пропсы компонента */
      let varsName = '';
      const vars = ((props) => {
        return Object.keys(props)
          .map((v) => {
            varsName += `${v}:${v},`;
            return `const ${v} = checkProp(props.${v});\n`;
          })
          .join('');
      })(props);

      return new Function(
        'props',
        `${cp}${dataset}${vars}${fns} return {methods:{${fnsName}},props:{${varsName}},template:\`${stringTemplate}\`}`
      );
    })(js, stringTemplate);

    const component = (COMPONENTS[componentName] = new Component({
      /** {String} Имя компонента */
      name: componentName,
      /** {Function} Шаблон */
      template: template,
      /** {String} css стили для шаблона */
      style: stringStyle,
      /** {Object} Свойства для отрисовки шаблона */
      props: js.props,
      /** {Function} Функция вызываемая при создании экземпляра компонента */
      created: js.created,
      /** {Function} Функция вызываемая при монтировании компонента */
      mounted: js.mounted,
      /** {Object} Методы компонента */
      methods: js.methods,
      /** {array} экземпляры */
      instances: [],
      /** {String} путь к компоненту */
      path: `${CONFIG.componentsDirectory}/${componentName}/`
    }));

    addStyles(stringStyle);

    if (callback) callback(component);

    return component;

  }

  /**
   * Отрендерить и заменить узел на компонент.
   *
   * @param {Element} $elem - узел для замены
   * @param {String} componentName - название компонента
   */
  function renderComponent($elem, componentName, callback) {

    const component = COMPONENTS[componentName];
    const entryChilds = $elem.childNodes;
    const entrySlots = selectAllNode($elem, 'slot');
    const entryMethods = (($elem) => {
      const methods = {};
      forEachObject($elem, (key, value) => {
        if (key.includes('$')) methods[key] = value;
      });
      return methods;
    })($elem);

    const { props, attributes } = (($elem, component) => {
      const props = clonePropObject(component.props);
      const attributes = {};

      forEachObject($elem.attributes, (attrKey, attribute) => {
        const attrName = attribute.nodeName;
        const attrValue = attribute.nodeValue;
        let match = false;
        forEachObject(props, (propKey, prop) => {
          if (propKey == attrName) {
            match = true;
            prop.value = attrValue;
          }
        });
        if (!match) attributes[attrName] = attrValue;
      });

      return {
        props: props,
        attributes: attributes
      };
    })($elem, component);

    /** Создание компонента из шаблона по пропсам */
    const $componentInstance = ((component, props) => {

      const newInstance = component.render(props);
      
      findComponents(newInstance.instance);

      const $elems = selectAllNode(newInstance.instance, '*');

      /** Создание обработчиков событий */
      $elems.forEach(($element) => {
        $element.outerHTML
          .split(/>\s+</)[0]
          .replace(/\s+(.*?)=['"]+(.*?)['"]/gi, (a, b, c) => {
            if (isEventAttribute(b)) {
              const attrName = b;
              const eventType = b.slice(2);
              const attrValue = c;
              const eventFunctionName = `$${attrValue}`;

              $element[eventFunctionName] = newInstance.methods[attrValue];

              $element.addEventListener(eventType, (event) => {
                $element[eventFunctionName](event, $element);
              });

              if (!tagNameIsComponent($element.tagName))
                $element.removeAttribute(attrName);
            }
          });
      });

      /** Экземпляр компонента */
      newInstance.instance.__props = props;
      newInstance.instance.__created = component.created;
      newInstance.instance.__mounted = component.mounted;
      newInstance.instance.__methods = newInstance.methods;

      return newInstance.instance;
    })(component, props);

    const callbackObject = {
      component: COMPONENTS[componentName],
      instance: $componentInstance,
      props: props,
      childs: entryChilds
    }

    forEachObject(entryMethods, (name, method) => {
      $componentInstance[name] = method;
    });

    $componentInstance.__created(callbackObject);

    //установить простые атрибуты для узла
    forEachObject(attributes, (name, value) => {
      if ($componentInstance.hasAttribute(name)) {
        $componentInstance.setAttribute(
          name,
          `${$componentInstance.getAttribute(name)} ${value}`
        );
      } else {
        if (isEventAttribute(name)) {
          $componentInstance.removeAttribute(name);
          $componentInstance.addEventListener(name.slice(2), (event) => {
            entryMethods[`$${value}`](event, $componentInstance);
          });
        } else {
          $componentInstance.setAttribute(name, value);
        }
      }
    });

    const newElemSlots = selectAllNode($componentInstance, 'slot');

    //перенести дочернии узлы в слоты
    if (entryChilds.length && newElemSlots.length) {
      //если нужно по слотам
      if (entrySlots.length) {
        for (let outSlot of entrySlots) {
          const outSlotName = outSlot.getAttribute('name');

          for (let inSlot of newElemSlots) {
            const inSlotName = inSlot.getAttribute('name');
            if (outSlotName == inSlotName) replaseElement(inSlot, outSlot); 
          }
        }

        //все в один слот
      } else {
        replaseElement($elem, newElemSlots[0]);
      }
    }

    replaseElement($elem, $componentInstance);
    COMPONENTS[componentName].instances.push($componentInstance);
    $componentInstance.__mounted(callbackObject);

    if (callback) callback($componentInstance);

    return $componentInstance;

  }


  /**
   * Проверяет и приводит к типу значение пропса
   * 
   * @param {Object} prop - объект пропса компонента
   */
  function checkProp(prop) {
    let propValue = prop.value || null;
    const propType = prop.type || 'String';
    const propDefault = prop.default;

    if (propValue != null) {
      if (propType != 'String') {
        propValue = (new Function(`return ${propValue}`))();
      } else {
        propValue = `${propValue}`;
      }
    }  
    return typeof propDefault != 'undefined' && !propValue ? propDefault : propValue;
  }

  /**
   * Возвращает назваине компонента из имени тега.
   * @param {String} tagName — название тега
   */
  function getComponentName(tagName) {
    return (
      tagName[0] + tagName.toLowerCase().slice(1).replace(CONFIG.tagSign, '')
    );
  }

  /**
   * Является ли атрибут листнером события.
   *
   * @param {String} attrName - название атрибута
   */
  function isEventAttribute(attrName) {
    return attrName.indexOf('on') + 1 == 1 && attrName.length > 2
      ? true
      : false;
  }

  /**
   * Является ли тэг указателем на компонент.
   *
   * @param {String} name — имя компонента
   */
  function tagNameIsComponent(name) {
    return name.includes(CONFIG.tagSign) ? true : false;
  }

  /**
   * Хелпер для циклов по массиву.
   *
   * @param {Object} obj - объект для перебора
   * @param {Function} callback - калбек с аргументами (ключ, значение)
   */
  function forEachObject(obj, callback) {
    Object.keys(obj).forEach((key) => {
      callback(key, obj[key]);
    });
  }

  /**
   * Хелпер выбора элемента. Возвращает html элемент.
   *
   * @param {HTMLElement} $from - где выбирать
   * @param {String} selector - css селектор
   */
  function selectNode($from, selector) {
    return $from.querySelector(selector);
  }

  /**
   * Хелпер выбора элемента. Возвращает коллекцию элементов.
   *
   * @param {HTMLElement} $from - где выбирать
   * @param {String} selector - css селектор
   */
  function selectAllNode($from, selector) {
    return $from.querySelectorAll(selector);
  }

  /**
   * Хелпер клонирующий объекты.
   *
   * @param {Object} obj - клонируемый объект
   */
  function clonePropObject(obj) {
    let newObj = {};
    forEachObject(obj, (key, value) => {
      newObj[key] = {
        type: value.type.name,
        default: typeof value.default != 'undefined' ? value.default : null
      };
    });

    return newObj;
  }

  /**
   * Проверка установлен ли компонент.
   *
   * @param {String} name — имя компонента
   */
  function isInstalled(name) {
    return COMPONENTS[name] ? true : false;
  }

  /**
   * Хелпер заменяющий элемент.
   * 
   * @param {HTMLElement} $elem - елемент который требуется заменить
   * @param {*} $newElem — новый элемент
   */
  function replaseElement($elem, $newElem){
    return $elem.parentElement.replaceChild($newElem, $elem);
  }

})();
