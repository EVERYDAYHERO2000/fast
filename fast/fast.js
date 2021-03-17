(() => {
  const __fast__ = (window.__fast__ = {
    components: {},
    /** Конфиг */
    config: {
      /** Символ компонента */
      tagSign: ":",
      /** Директория с компонентами */
      componentsDirectory: "src/components",
      /** Псевдонимы */
      aliases: [
        { "@root": "" },
        { "@components": "__fast__.config.componentsDirectory" },
        {
          "@component":
            "${__fast__.config.componentsDirectory}/${componentName}/assets",
        },
      ],
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
   * Инициализация `__fast__`.
   * @param {Object} config - конфиг
   * @param {NodeList} $entryElem - узел, точка входа
   * @param {Function} callback - колбек
   */
  function init(config, $entryElem, callback) {
    $entryElem = $entryElem || document.body;
    __fast__.config = { ...__fast__.config, ...config };
    addStyles(__fast__.config.css + ".fast-inited {opacity: 0}");

    $entryElem.classList.add("fast-inited");

    loadComponents(__fast__.config.components, function (result) {
      installMultipleComponents(result);
      findComponents($entryElem, function ($elem) {
        if (callback) callback($elem);

        /** нужно починить */
        setTimeout(() => $entryElem.classList.remove("fast-inited"), 500);
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
        $entryElem.querySelectorAll("*").forEach(($elem) => {
          if (tagNameIsComponent($elem.tagName)) {
            const name = getComponentName($elem.tagName);
            if (!isInstalled(name) && !arr.includes(name)) arr.push(name);
          }
        });
      return arr;
    })($entryElem);

    loadComponents(needToInstall, function (result) {
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
          if (!["SCRIPT", "STYLE"].includes($entryElem.tagName)) {
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
   * Возвращает назваине компонента из имени тега.
   * @param {String} tagName — название тега
   */
  function getComponentName(tagName) {
    return (
      tagName[0] +
      tagName.toLowerCase().slice(1).replace(__fast__.config.tagSign, "")
    );
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
    const results = [];
    const config = __fast__.config;

    components.forEach(function (componentName, i) {
      list.push(
        fetch(
          `${config.componentsDirectory}/${componentName}/${componentName}.${config.componentsExtension}`
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

    Promise.all(list).then(() => callback(results));
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
    const fragmentTemplate = fragment.querySelector("template").content.children[0].outerHTML;
    const fragmentStyle = fragment.querySelector("style").textContent;
    const fragmentScript = fragment.querySelector("script").textContent;


    return {
      Template: cookTemplate(fragmentTemplate, componentName),
      Script: cookScript(fragmentScript, componentName),
      Style: cookStyle(fragmentStyle, componentName),
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
        fastStyles.textContent += result.text ? `${result.text}\n` : "";
      });
    } else {
      fastStyles.textContent += `${cssRules}\n`;
    }

    return fastStyles.textContent;
  }

  /**
   * Заменить вхождения подстроки на значение псевдонима.
   * 
   * @param {String} string - строка шаблона для поиска и замены вхождений на псевдонимы
   * @param {String} componentName - имя компонента
   */
  function replaceAlias (string, componentName) {
    __fast__.config.aliases.forEach((e) => {
        const name = Object.keys(e)[0];
        const value = new Function("componentName", `return \`${e[name]}\``)(
          componentName
        );

        string = string.replaceAll(name, value);
    });
    return string;
  }

  /**
   * Установка нескольких компонентов.
   *
   * @param {Array} series - массив загруженных данных для установки компонентов
   */
  function installMultipleComponents(series, callback) {
    series.forEach((s) => {
      if (!isInstalled(s.name))
        installComponent(s.context, s.name, function (component) {
          if (callback) callback(component);
        });
    });
  }

  /**
   * Инсталировать компонент в `__fast__.components[componentName]`.
   *
   * @param {String} context - строка, содержимое файла компонента
   * @param {String} componentName - название компонента
   */
  function installComponent(context, componentName, callback) {
    //try {
    const { Template, Script, Style } = parseTemplate(
      context,
      componentName
    );

    const js = {
        props: {},
        created: function (e) {
          return e;
        },
        mounted: function (e) {
          return e;
        },
        methods: {},
        ...new Function(`return ${Script}`)(),
      };    

    const template = (function (js, Template) {  

      const methods = js.methods;
      const props = js.props;  

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
        `${vars}${fns} return {methods:{${fnsName}},template:\`${Template}\`}`
      );
    })(js, Template);


    const component = __fast__.components[componentName] = {
        /** {String} Имя компонента */
        name : componentName,
        /** {Function} Шаблон */
        create : template,
        /** {String} css стили для шаблона */
        style : Style,
        /** {Object} Свойства для отрисовки шаблона */
        props : js.props,
        /** {Function} Функция вызываемая при создании экземпляра компонента */
        created : js.created,
        /** {Function} Функция вызываемая при монтировании компонента */
        mounted : js.mounted,
        /** {Object} Методы компонента */
        methods : js.methods,
        /** {array} экземпляры */
        instances : [],
        /** {String} путь к компоненту */
        path : `${__fast__.config.componentsDirectory}/${componentName}/`
    };

    addStyles(Style);

    if (callback) callback(component);

    return component;
    /*  
    } catch (err) {
      console.error(`Component <${componentName}> not found and can't be installed. Check component file directory.`);
    }
    */
  }

  function cookTemplate(fragment, componentName) {

    fragment = replaceAlias(fragment, componentName);

    /**
     * Интерполяция названий методов в инлайновых обработчиках событий
     * пример on:click="${onClick}" => on:click="onClick"
     * методы событий крепятся к экземпляру компонента на этапе создания экземпляра
     * */
    fragment = fragment.replace(
      /on([a-z]+)=['"]?\$\{([\w\d_]+)\}['"]?/gi,
      function (e, a, b) {
        return `on${a}="${b}"`;
      }
    );

    /** Лишнии пробелы */
    fragment = fragment.replace(/ +(?= )/g, "");

    /** Исправить стрелочные функции */
    fragment = fragment.replaceAll("=&gt;", "=>");

    return fragment;
  }

  function cookStyle(fragment, componentName) {

      fragment = replaceAlias(fragment, componentName);

      fragment = fragment.trim().replace(/ +(?= )/g, "");

      return fragment;
  }

  function cookScript(fragment, componentName) {
        fragment = fragment.trim();
        fragment = (fragment.length) ? fragment : '({})';
        fragment = replaceAlias(fragment, componentName);

        return fragment;
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
        const $template = parser.parseFromString(newI.template, "text/html")
          .body;

        const $instance = $template.children[0];

        findComponents($instance, function(e){
            
        });

        const $elems = $template.querySelectorAll("*");

        

        /** Создание обработчиков событий */
        $elems.forEach(function ($element) {

        

          for (let attr of $element.attributes) {
            if (attr.name.indexOf("on") + 1 == 1) {
              const attrName = attr.name;
              const eventType = attrName.slice(2);
              const attrValue = attr.nodeValue;
              const eventFunctionName = `__${attrValue}`;

              $element[eventFunctionName] = newI.methods[attrValue];
              $element.addEventListener(eventType, $element[eventFunctionName]);
              $element.removeAttribute(attrName);

            }
          }
        });

        /** Экземпляр компонента */
        

        $instance.__props = props;
        $instance.__created = component.created;
        $instance.__mounted = component.mounted;
        $instance.__methods = newI.methods;

        return $instance;
      })(props);

      
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

      if (callback) callback($componentInstance);

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
