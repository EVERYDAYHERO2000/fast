(function () {
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
    findComponents: findComponents,
    init: init,
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

      if (fn && fn.mounted) this.mounted = fn.mounted;
      if (fn && fn.created) this.created = fn.created;

      return this;
    }
    mounted(e) {
      return e;
    }
    created(e) {
      return e;
    }
  }

  /**
   * Инициализация `__fast__`.
   * @param {Object} config - конфиг
   * @param {NodeList} $entryElems - набор узлов документа
   * @param {Function} callback - колбек
   */
  function init(config, $entryElems, callback) {
    $entryElems = $entryElems || document.body.querySelectorAll("*");
    __fast__.config = { ...__fast__.config, ...config };
    addStyles(__fast__.config.css);
    loadComponents(__fast__.config.components, function (result) {
      result.forEach(function (r) {
        installComponent(r.context, r.name);
      });
      findComponents($entryElems, function (f) {
        if (callback) callback(f);
      });
    });
  }

  /**
   * Проверить все элементы в коллекции.
   *
   * @param {NodeList} $elems - набор узлов (или узел) для проверки
   * @param {Function} callback - колбек
   */
  function findComponents($elems, callback) {
    /** компоненты которые необходимо установить */
    const needToInstall = [];
    /** элементы которые нужно отрендерить */
    const needToRender = [];

    $elems =
      $elems.constructor.name != "NodeList"
        ? $elems.querySelectorAll("*")
        : $elems;

    $elems.forEach(function ($elem) {
      const tagName = $elem.tagName;

      if (tagName && tagName.includes(__fast__.config.tagSign)) {
        const componentName =
          tagName[0] + tagName.toLowerCase().slice(1, tagName.length - 1);

        if (!__fast__.components[componentName]) {
          needToInstall.push(componentName);
          __fast__.components[componentName] = new Component();
        }

        needToRender.push({
          componentName: componentName,
          component: __fast__.components[componentName],
          $elem: $elem,
        });
      }
    });

    if (needToInstall.length) {
      loadComponents(needToInstall, function (result) {
        result.forEach(function (r) {
          installComponent(r.context, r.name);
        });

        needToRender.forEach(function (e) {
          if (e.$elem.parentElement) renderComponent(e.$elem, e.componentName);
        });
        if (callback) callback(__fast__, $elems);
      });
    } else {
      needToRender.forEach(function (e) {
        renderComponent(e.$elem, e.componentName);
      });
      if (callback) callback(__fast__, $elems);
    }

    console.log(needToInstall)

  }

  /**
   * Отрендерить и заменить узел на компонент.
   *
   * @param {Element} $elem - узел для замены
   * @param {String} componentName - название компонента
   */
  function renderComponent($elem, componentName) {


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

      if (componentName == 'Icon'){
        console.log(typeof component, component.create, __fast__.components.Icon.name)

        component.create = function(props) {
          const name = (props.name && props.name.value) ? props.name.value : undefined;
           return {methods:{},template:`<div class="icon"></div>`}
        }
        component.instances = []
      }  
  
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

    

    findComponents($componentInstance.querySelectorAll("*"));
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
            if (outSlotName == inSlotName) сhildToSlot(outChilds, inSlot);
          }
        }

        //все в один слот
      } else {
        сhildToSlot(entryChilds, newElemSlots[0]);
      }
    }


    $elem.parentElement.replaceChild($componentInstance, $elem);
    __fast__.components[componentName].instances.push($componentInstance);
    $componentInstance.__mounted({
      component: __fast__.components[componentName],
      instance: $componentInstance,
      props: props,
    });

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
  function сhildToSlot(childs, slot) {

    const fragment = document.createDocumentFragment();

    findComponents(childs, function(__fast__, $newElems){

      //console.log($newElems[1].children[0].children[0])

      /** починить */
      setTimeout(function(){

        
        $newElems.forEach(function (child) {
          if (child.tagName) fragment.append(child);
        });
    
        slot.parentElement.replaceChild(fragment, slot);

      },500);

    });

    return childs;
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
   * Инсталировать компонент в `__fast__.components[componentName]`.
   *
   * @param {String} context - строка, содержимое файла компонента
   * @param {String} componentName - название компонента
   */
  function installComponent(context, componentName) {
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
      let fnsName = '';
      const fns = (function (methods) {
        return Object.keys(methods)
          .map(function (f) {
            fnsName += `${f}:${f},` 
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

      

      return new Function("props",`${vars}${fns} return {methods:{${fnsName}},template:\`${html}\`}`);
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
    /** {Function} Функция вызываемая при мантировании компонента */
    component.mounted = fragmentScript.mounted;
    /** {Object} Методы компонента */
    component.methods = fragmentScript.methods;
    /** {array} экземпляры */
    component.instances = [];
    /** {String} путь к компоненту */
    component.path = `${__fast__.config.componentsDirectory}/${componentName}/`;

    addStyles(fragmentStyle);

    return component;
    /*  
    } catch (err) {
      console.error(`Component <${componentName}> not found and can't be installed. Check component file directory.`);
    }
    */
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
        fastStyles.textContent += `${result.text}\n`;
      });
    } else {
      fastStyles.textContent += `${cssRules}\n`;
    }

    return fastStyles.textContent;
  }
})();
