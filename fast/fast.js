(() => {
  const __fast__ = (window.__fast__ = {
    components: {},
    /** Конфиг */
    config: {
      /** Символ компонента */
      tagSign: ":",
      /** Директория с компонентами */
      componentsDirectory: "src/components",
      /** Расширение файлов компонента */
      componentsExtension: "html",
      /** Предзагрузка компонентов */
      components: [],
      /** Глобальные css правила */
      css: "",
    },
    init: init,
    findComponents: findComponents,
    installComponent: installComponent,
    parseTemplate: parseTemplate,
  });

  /**
   * Класс компонента
   */
  class Component {
    constructor(fn) {
      this.props = fn ? fn.props : {};
      this.methods = fn ? fn.methods : {};
      this.name = fn ? fn.name : "";
      this.mounted = fn ? fn.mounted : (e) => false;
      this.created = fn ? fn.created : (e) => false;
      return this;
    }

  }

  /**
   * Инициализация `__fast__`.
   * @param {Object} config - конфиг
   * @param {NodeList} $entryElems - набор узлов документа
   * @param {Function} callback - колбек
   */
  function init(config, $entryElems, callback) {
    $entryElems = $entryElems || document.body;
    __fast__.config = { ...__fast__.config, ...config };
    addStyles(__fast__.config.css);
    loadComponents(__fast__.config.components, function (result) {
      result.forEach(function (r) {
        if (!isInstalled(e.name)) installComponent(r.context, r.name);
      });
      findComponents($entryElems, function (f) {
        if (callback) callback(f);
      });
    });
  }

  /**
   * Проверить все элементы в узле.
   *
   * @param {HTMLElement} entryPoint - набор узлов (или узел) для проверки
   * @param {Function} callback - колбек
   */
  function findComponents(entryPoint, callback) {
    /** Найти все неустановленные компоненты в пределах узла. */
    const needToInstall = ((entryPoint) => {
      const arr = [];
      
      if (entryPoint.tagName) entryPoint.querySelectorAll("*").forEach((e) => {
        if (tagNameIsComponent(e.tagName)) {
          const name = getComponentName(e.tagName);
          arr.push(name);
        }
      });
      return arr;
    })(entryPoint);

    loadComponents(needToInstall, function (result) {
      result.forEach((e) => {
        if (!isInstalled(e.name)) installComponent(e.context, e.name);
      });

      search(entryPoint);

      if (callback) callback(entryPoint);
    });

    /**
     * Рекурсивная функция, ищет компоненты в глубину элемента.
     *
     * @param {HTMLElement} entryPoint — узел входа
     */
    function search(entryPoint) {
      /** является узлом */
      if (entryPoint.tagName) {
        const tagName = entryPoint.tagName;

        /** компонент */
        if (tagNameIsComponent(tagName)) {
          const name = getComponentName(tagName);

          /** если установлен */
          if (isInstalled(name)) {
            renderComponent(entryPoint, name, function(el){
                
            });
            
          } 

          /** узел */
        } else {
          /** если не скрипт и не стиль */
          if (!["SCRIPT", "STYLE"].includes(entryPoint.tagName)) {
            /** продолжить поиск в глубину */
            if (entryPoint.childNodes.length) {
              entryPoint.childNodes.forEach((element) => {
                search(element);
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
   * Возвращает назваине компонента из имени тега.
   * @param {String} tagName — название тега
   */
  function getComponentName(tagName) {
    return tagName[0] + tagName.toLowerCase().slice(1).replace(__fast__.config.tagSign, '');
  }

  /**
   * Является ли тэг указателем на компонент.
   * 
   * @param {String} name — имя компонента
   */
  function tagNameIsComponent(name) {
    return name.includes(__fast__.config.tagSign) ? true : false;
  }

  /**
   * Проверка установлен ли компонент.
   *
   * @param {String} name — имя компонента
   */
  function isInstalled(name) {
    return __fast__.components[name] ? true : false;
  }

  /**
   * Загрузить компоненты из файлов.
   *
   * @param {Array} components - массив строк с названиями компонентов
   * @param {Function} callback - колбек
   */
  function loadComponents(components, callback) {
    const list = [];
    var results = [];

    components.forEach(function (componentName, i) {
      list.push(
        fetch(
          `${__fast__.config.componentsDirectory}/${componentName}/${componentName}.${__fast__.config.componentsExtension}`
        )
          .then(function (response) {
            return response.text();
          })
          .then(function (context) {
            results[i] = {
              context: context,
              name: componentName,
            };
          })
      );
    });

    Promise.all(list).then(function () {
      callback(results);
    });
  }

  /**
   * Разбирает строку компонента и возвращает 3 объекта (шаблон, скрипт, стили).
   *
   * @param {String} context - строчное представление файла компонента
   * @param {String} componentName - имя компонента
   */
  function parseTemplate(context, componentName) {
    const parser = new DOMParser();
    const fragment = parser.parseFromString(context, "text/html");
    const fragmentTemplate = fragment.querySelector("template").content;
    const fragmentScript = (function () {
      const raw = (function () {
        let trimed = fragment.querySelector("script")
          ? fragment.querySelector("script").innerText.trim()
          : "({})";
        trimed =
          trimed[trimed.length - 1] == ";"
            ? trimed.slice(0, trimed.length - 1)
            : trimed;
        trimed = trimed.slice(1, trimed.length - 1);
        return trimed;
      })();

      const result = {
        props: {},
        created: function (e) {
          return e;
        },
        mounted: function (e) {
          return e;
        },
        methods: {},
        ...new Function(`return ${raw}`)(),
      };

      return result;
    })();

    const fragmentStyle = (function (fragment) {
      let style = fragment.querySelector("style")
        ? fragment
            .querySelector("style")
            .textContent.replaceAll(
              "@component",
              `${__fast__.config.componentsDirectory}/${componentName}/assets`
            )
        : "";

      return style;
    })(fragment);

    return {
      fragmentTemplate: fragmentTemplate,
      fragmentScript: fragmentScript,
      fragmentStyle: fragmentStyle,
    };
  }

  /**
   * Добавляет правила css.
   *
   * @param {String} cssRules - строка с css
   */
  function addStyles(cssRules) {
    let fastStyles = document.getElementById("fast-styles");
    if (!fastStyles) {
      fastStyles = document.createElement("style");
      fastStyles.setAttribute("id", "fast-styles");
      document.head.append(fastStyles);
    }

    if (Sass) {
      Sass.compile(cssRules, function (result) {
        fastStyles.textContent += (result.text) ? `${result.text}\n` : '';
      });
    } else {
      fastStyles.textContent += `${cssRules}\n`;
    }

    return fastStyles.textContent;
  }

  /**
   * Инсталировать компонент в `__fast__.components[componentName]`.
   *
   * @param {String} context - строка, содержимое файла компонента
   * @param {String} componentName - название компонента
   */
  function installComponent(context, componentName, callback) {
    //try {
    const { fragmentTemplate, fragmentScript, fragmentStyle } = parseTemplate(
      context,
      componentName
    );

    const template = (function (props, methods, fragmentTemplate) {
      /** Строчный шаблон компонента */
      const html = (function (fragmentTemplate) {
        let tpl = fragmentTemplate.children[0].outerHTML || "";

        /**
         * Интерполяция названий методов в инлайновых обработчиках событий
         * пример on:click="${onClick}" => on:click="onClick"
         * методы событий крепятся к экземпляру компонента на этапе создания экземпляра
         * */
        tpl = tpl.replace(
          /on([a-z]+)=['"]?\$\{([\w\d_]+)\}['"]?/gi,
          function (e, a, b) {
            return `on${a}="${b}"`;
          }
        );

        return tpl;
      })(fragmentTemplate);

      /** Интерполяция методов компонента */
      let fnsName = "";
      const fns = (function (methods) {
        return Object.keys(methods)
          .map(function (f) {
            fnsName += `${f}:${f},`;
            return `const ${f} = ${methods[f]};\n`;
          })
          .join("");
      })(methods);

      /** Пропсы компонента */
      const vars = (function (props) {
        return Object.keys(props)
          .map(function (v) {
            return `const ${v} = (props.${v} && props.${v}.value) ? props.${v}.value : undefined;\n`;
          })
          .join("");
      })(props);

      return new Function(
        "props",
        `${vars}${fns} return {methods:{${fnsName}},template:\`${html}\`}`
      );
    })(fragmentScript.props, fragmentScript.methods, fragmentTemplate);

    if (!__fast__.components[componentName])
      __fast__.components[componentName] = {};

    const component = __fast__.components[componentName];

    /** {String} Имя компонента */
    component.name = componentName;
    /** {Function} Шаблон */
    component.create = template;
    /** {String} css стили для шаблона */
    component.style = fragmentStyle;
    /** {Object} Свойства для отрисовки шаблона */
    component.props = fragmentScript.props;
    /** {Function} Функция вызываемая при создании экземпляра компонента */
    component.created = fragmentScript.created;
    /** {Function} Функция вызываемая при монтировании компонента */
    component.mounted = fragmentScript.mounted;
    /** {Object} Методы компонента */
    component.methods = fragmentScript.methods;
    /** {array} экземпляры */
    component.instances = [];
    /** {String} путь к компоненту */
    component.path = `${__fast__.config.componentsDirectory}/${componentName}/`;

    addStyles(fragmentStyle);

    if (callback) callback(component);

    return component;
    /*  
    } catch (err) {
      console.error(`Component <${componentName}> not found and can't be installed. Check component file directory.`);
    }
    */
  }

    /**
   * Отрендерить и заменить узел на компонент.
   *
   * @param {Element} $elem - узел для замены
   * @param {String} componentName - название компонента
   */
  function renderComponent($elem, componentName, callback) {


    //try {
    const entryChilds = $elem.childNodes;
    const entrySlots = $elem.querySelectorAll("slot");
    const entryAttributes = (($elem) => {
      const result = {};
      for (let a of $elem.attributes) {
        result[a.nodeName] = a.nodeValue;
      }
      return result;
    })($elem);

    const component = __fast__.components[componentName];
    const props = JSON.parse(JSON.stringify(component.props));
    const simpleAttributes = {};

    //заполнить свойства экземпляра
    for (let attr in entryAttributes) {
      let match = false;
      for (let prop in props) {
        if (prop == attr) {
          match = true;
          props[prop].value = entryAttributes[attr];
        }
      }
      if (!match) simpleAttributes[attr] = entryAttributes[attr];
    }

    /** Создание компонента из шаблона по пропсам */
    const $componentInstance = (function (props) {
      const parser = new DOMParser();
      //console.log(__fast__.components[componentName], componentName, component.name, component.create)
  
      const newI = component.create(props);
      const $template = parser.parseFromString(
        newI.template,
        "text/html"
      ).body;

      

      const $elems = $template.querySelectorAll("*");

      
      /** Создание обработчиков событий */
      $elems.forEach(function ($element) {
        for (let attr of $element.attributes) {
          if (attr.name.indexOf("on") + 1 == 1) {
            const attrName = attr.name;
            const eventType = attrName.slice(2);
            const attrValue = attr.nodeValue;
            const eventFunctionName = `__${attrValue}`;

            

            $element[eventFunctionName] = component.methods[attrValue];
            $element.addEventListener(eventType, $element[eventFunctionName]);
            $element.removeAttribute(attrName);
          }
        }
      });


      /** Экземпляр компонента */
      const $instance = $template.children[0];

      $instance.__props = props;
      $instance.__created = component.created;
      $instance.__mounted = component.mounted;
      $instance.__methods = newI.methods;

      return $instance;
    })(props);

    

    findComponents($componentInstance);
    $componentInstance.__created({
      component: __fast__.components[componentName],
      instance: $componentInstance,
      props: props,
    });


    //установить простые атрибуты для узла
    for (let attr in simpleAttributes) {
      
      if ($componentInstance.hasAttribute(attr)) {
        $componentInstance.setAttribute(
          attr,
          `${$componentInstance.getAttribute(attr)} ${simpleAttributes[attr]}`
        );
      } else {
        $componentInstance.setAttribute(attr, simpleAttributes[attr]);
      }
    }

    const newElemSlots = $componentInstance.querySelectorAll("slot");

    //перенести дочернии узлы в слоты
    if (entryChilds.length && newElemSlots.length) {
      //если нужно по слотам
      if (entrySlots.length) {
        for (let outSlot of entrySlots) {
          const outSlotName = outSlot.getAttribute("name");
          const outChilds = outSlot.childNodes;

          for (let inSlot of newElemSlots) {
            const inSlotName = inSlot.getAttribute("name");
            if (outSlotName == inSlotName) slotToSlot(outSlot, inSlot);
          }
        }

        //все в один слот
      } else {
        slotToSlot($elem, newElemSlots[0]);
      }
    }


    $elem.parentElement.replaceChild($componentInstance, $elem);
    __fast__.components[componentName].instances.push($componentInstance);
    $componentInstance.__mounted({
      component: __fast__.components[componentName],
      instance: $componentInstance,
      props: props,
    });

    if (callback) callback($componentInstance)

    return $componentInstance;
    /*  
    } catch (err) {
      console.error(`Component <${componentName}> can't be rendered.`);
    }
    */
   
  }

  /**
   * Переместить узлы в слот.
   *
   * @param {NodeList} childs - набор узлов для перемещения
   * @param {Element} slot - узел слота `<slot>`
   */
  function slotToSlot(outSlot, inSlot) {
    inSlot.parentElement.replaceChild(outSlot, inSlot);    
  }

})();
