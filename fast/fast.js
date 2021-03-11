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
      componentExtension: "html",
      /** Предзагрузка компонентов */
      components: [],
      /** Глобальные css правила */
      css: "",
    },
    findComponents: findComponents,
    init: init,
    installComponent: installComponent,
  });

  /**
   * Инициализация `__fast__`.
   * @param {Object} config - конфиг
   * @param {NodeList} entryElems - набор узлов документа
   * @param {Function} callback - колбек
   */
  function init(config, entryElems, callback) {
    entryElems = entryElems || document.body.querySelectorAll('*');  
    __fast__.config = { ...__fast__.config, ...config };
    addStyles(__fast__.config.css);
    loadComponents(__fast__.config.components, function (result) {
      result.forEach(function (r) {
        installComponent(r.context, r.name);
      });
      findComponents(entryElems, function(f){

        if (callback) callback(f)

      });
    });
  }

  /**
   * Проверить все элементы в коллекции.
   *
   * @param {NodeList} elems - набор узлов для проверки
   * @param {Function} callback - колбек
   */
  function findComponents(elems, callback) {
    /** компоненты которые необходимо установить */
    const needToInstall = [];
    /** элементы которые нужно отрендерить */
    const needToRender = [];

    for (const elem of elems) {
      const tagName = elem.tagName;

      if (tagName && tagName.includes(__fast__.config.tagSign)) {
        const componentName =
          tagName[0] + tagName.toLowerCase().slice(1, tagName.length - 1);

        if (!__fast__.components[componentName]) {
          needToInstall.push(componentName);
          __fast__.components[componentName] = {};
        }

        needToRender.push({
          componentName: componentName,
          component: __fast__.components[componentName],
          elem: elem,
        });
      }
    }

    if (needToInstall.length) {
      loadComponents(needToInstall, function (result) {
        result.forEach(function (r) {
          installComponent(r.context, r.name);
        });

        needToRender.forEach(function (e) {
          if (e.elem.parentElement) renderComponent(e.elem, e.componentName);
        });
        if (callback) callback(__fast__)
      });
    } else {
      needToRender.forEach(function (e) {
        renderComponent(e.elem, e.componentName);
      });
      if (callback) callback(__fast__)
    }

  }

  /**
   * Отрендерить и заменить узел на компонент.
   *
   * @param {Element} elem - узел для замены
   * @param {String} componentName - название компонента
   */
  function renderComponent(elem, componentName) {
    const entryChilds = elem.childNodes;
    const entrySlots = elem.querySelectorAll("slot");
    const entryAttributes = (() => {
      const result = {};
      for (let a of elem.attributes) {
        result[a.nodeName] = a.nodeValue;
      }
      return result;
    })();

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

    const newElem = (function (props) {
      const parser = new DOMParser();

      const template = parser.parseFromString(
        component.template(props),
        "text/html"
      ).body;
      const elems = template.querySelectorAll("*");

      for (let e of elems) {
        for (let a of e.attributes) {
          if (a.name.includes(":")) {
            const eventProp = {
              name: a.name.replace(":", ""),
              value: `__${a.nodeValue}`,
            };

            e[eventProp.value] = component.methods[a.nodeValue];
            e.removeAttribute(a.name);
            e.addEventListener(
              eventProp.name.slice(2),
              component.methods[a.nodeValue]
            );
          }
        }
      }

      const newElement = template.children[0];

      newElement.__created = component.created;
      newElement.__mounted = component.mounted;

      return newElement;
    })(props);

    findComponents(newElem.querySelectorAll("*"));
    newElem.__created(newElem);

    //установить простые атрибуты для узла
    for (let attr in simpleAttributes) {
      if (newElem.hasAttribute(attr)) {
        newElem.setAttribute(
          attr,
          `${newElem.getAttribute(attr)} ${simpleAttributes[attr]}`
        );
      } else {
        newElem.setAttribute(attr, simpleAttributes[attr]);
      }
    }

    const newElemSlots = newElem.querySelectorAll("slot");
    
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
    
    elem.parentElement.replaceChild(newElem, elem);
    __fast__.components[componentName].instances.push(newElem);
    newElem.__mounted(newElem);

    return elem;
  }

  /**
   * Переместить узлы в слот.
   *
   * @param {NodeList} childs - набор узлов для перемещения
   * @param {Element} slot - узел слота `<slot>`
   */
  function сhildToSlot(childs, slot) {
    const fragment = document.createDocumentFragment();
    

    findComponents(childs);

    for (let child of childs) {
      const clonedChild = child.cloneNode(true);
      fragment.append(clonedChild);
    }

    slot.parentElement.replaceChild(fragment, slot);

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
          `${__fast__.config.componentsDirectory}/${componentName}/${componentName}.${__fast__.config.componentExtension}`
        )
          .then(function (response) {
            //results[i] = response.text();
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
   * Инсталировать компонент в `__fast__.components[componentName]`.
   *
   * @param {String} context - строка, содержимое файла компонента
   * @param {String} componentName - название компонента
   */
  function installComponent(context, componentName) {
    const parser = new DOMParser();
    const fragment = parser.parseFromString(context, "text/html");
    const fragmentTemplate = fragment.querySelector("template").content;
    const fragmentScript = (function () {
      const raw = (function () {
        let trimed = fragment.querySelector("script").innerText.trim();
        trimed =
          trimed[trimed.length - 1] == ";"
            ? trimed.slice(0, trimed.length - 1)
            : trimed;
        trimed = trimed.slice(1, trimed.length - 1);
        return trimed;
      })();

      const result = {
        props: {},
        created: (e) => false,
        mounted: (e) => false,
        methods: {},
        ...new Function(`return ${raw}`)(),
      };

      return result;
    })();

    const fragmentStyle = fragment
      .querySelector("style")
      .textContent.replaceAll(
        "@component",
        `${__fast__.config.componentsDirectory}/${componentName}/assets`
      );

    const template = (function (props, fragmentTemplate) {
      let propsKeys = [];
      let html = fragmentTemplate.children[0].outerHTML;
      for (let p in props) {
        propsKeys.push(p);
      }

      let vars = "";
      for (let v in propsKeys) {
        vars += `const ${propsKeys[v]} = (props.${propsKeys[v]} && props.${propsKeys[v]}.value) ? props.${propsKeys[v]}.value : 'undefined';\n`;
      }

      return new Function("props", `${vars} return \`${html}\``);
    })(fragmentScript.props, fragmentTemplate);

    if (!__fast__.components[componentName])
      __fast__.components[componentName] = {};

    const component = __fast__.components[componentName];

    /** {String} Имя компонента */
    component.name = componentName;
    /** {Function} Шаблон */
    component.template = template;
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

    addStyles(fragmentStyle);

    return component;
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

    fastStyles.textContent += `${cssRules}\n`;

    return fastStyles.textContent;
  }
})();
