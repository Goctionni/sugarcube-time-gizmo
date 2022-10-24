const GoctiTimeGizmoMemory = {};
Macro.add('GoctiTimeGizmo', {
  tags: [],
  handler() {
    const easeInOutQuad = (x) => {
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    };

    const updateEl = (_el, props = {}) => {
      const {innerHTML, children, classList, style, ...attributes} = props;
      if (innerHTML) {
        _el.innerHTML = innerHTML;
      }
      if (attributes) {
        Object.entries(attributes).forEach(([attr, value]) => {
          _el.setAttribute(attr, value);
        });
      }
      if (classList) {
        if (typeof classList === 'string') _el.className = classList;
        else _el.classList.add(...classList);
      }
      if (children) {
        if (children.length) {
          [...children].forEach((child) => _el.appendChild(child));
        } else if (children instanceof Element) {
          _el.appendChild(children);
        }
      }
      if (style) {
        Object.entries(style).forEach(([prop, value]) => _el.style.setProperty(prop, value));
      }
    };

    const createFactory = () => {
      const store = {};
      const create = (tag, props = {}) => {
        const _el = document.createElement(tag);
        updateEl(_el, props, store);
        return _el;
      };
      return [create, store];
    };
    
    const createGoctiTimeWidget = (() => {
      const [create] = createFactory();

      const createStars = ({numStars}) => {
        return Array.from({length: numStars}, () => create('span', {
          classList: 'gtg-star',
          style: {
            left: (Math.floor(Math.random() * 10000) / 100) + '%',
            top: (Math.floor(Math.random() * 10000) / 100) + '%',
            '--gtg-distance': Math.random(),
            '--gtg-rng': Math.random(),
          },
        }));
      };
    
      const parseTime = (time) => {
        if (typeof time === 'number') {
          if (time > 1000000) {
            // treat it as a unix timestamp
            return new Date(parseTime);
          }
          if (time <= 1000) {
            return time % 1000;
          }
          console.error('Could not parse time', time);
          return 0;
        }
    
        if (typeof time === 'string') {
          // 23:59, 07:00, 7:00, 2359, 0700, 700, 11:59am
          const matches = /^([012]?[0-9]):?([0-5]?[0-9])\s?(am|pm)?$/i.exec(time);
          if (matches) {
            const [hours, minutes, extra] = matches
              .slice(1)
              .map((part, index) => (index <= 1) ? parseInt(part) : part?.toLowerCase());
    
            if (hours >= 24 || minutes >= 60 || (extra && hours > 12)) {
              console.error('Could not parse valid time', {input: time, hours, minutes, extra});
              return 0;
            }
            if (extra) {
              if (hours < 12) {
                return parseTime({hours: hours + (extra === 'pm' ? 12 : 0), minutes});
              } else {
                return parseTime({hours: (extra === 'pm' ? 12 : 0), minutes});
              }
            } else {
              return parseTime({hours, minutes});
            }
          }
          return 0;
        }
    
        if (!time) {
          console.error('Invalid time passed', time);
          return 0;
        }
    
        if (typeof time === 'object') {
          if (Array.isArray(time)) {
            const [hours, minutes, extra] = time.map((val, index) => (index <= 1) ? parseInt(val) : extra?.toLowerCase());
            if (hours >= 24 || minutes >= 60 || (extra && hours > 12)) {
              console.error('Could not parse valid time', {input: time, hours, minutes, extra});
              return 0;
            }
            return parseTime({hours, minutes, extra});
          }
          if (time instanceof Date) {
            return parseTime({hours: time.getHours(), minutes: time.getMinutes()});
          }
          if (!['hours', 'minutes'].every(k => k in time)) {
            console.error('Time object missing hours or minutes', time);
          }
          let {hours, minutes, extra} = time;
          hours = parseInt(hours);
          minutes = parseInt(minutes);
          extra = (typeof extra === 'string') ? extra.toLowerCase() : null;
          if (extra) {
            if (hours < 12 && extra === 'pm') hours += 12;
            else if (hours === 12 && extra === 'am') hours = 0;
          }
          if (hours >= 24 || minutes >= 60 || minutes < 0 || hours < 0) {
            console.error('Could not parse valid time', {input: time, hours, minutes});
            return 0;
          }
          const hoursMinutes = hours + (minutes / 60);
          return (hoursMinutes / 24) * 1000;
        }
      };
    
      const isValidParentOrTarget = (el) => {
        if (typeof el === 'string') {
          const container = document.querySelectorAll(el);
          if (!container.length) throw new Error('TimeWidget Could not find target element', {selector: el});
          return [...container];
        }
        if (el && typeof el === 'object') {
          // one htmlelement
          if (el instanceof HTMLElement) {
            return [el];
          }
          if (el instanceof NodeList) {
            return [...el];
          }
          // Array of htmlelements
          if (Array.isArray(el) && el.every(item => item instanceof HTMLElement)) {
            return el;
          }
          // jQuery
          if (['length', 'prevObject'].every((attr) => attr in el)) {
            const elements = [...el];
            if (elements.every(item => item instanceof HTMLElement)) {
              return elements;
            }
          }
          throw new Error('TimeWidget target not a valid html element or collection of html elements', el);
        }
        return false;
      };
    
      const getContainer = ({target, parent}) => {
        if (target) {
          const el = isValidParentOrTarget(target);
          if (!el) throw new Error('TimeWidget, No valid target passed', target);
          return el;
        } else if (parent) {
          const parentEl = isValidParentOrTarget(parent);
          if (!parentEl) throw new Error('TimeWidget, No valid parent passed', parent);
          return parentEl.map((parentElement) => {
            const container = create('div');
            parentElement.appendChild(container);
            return container;
          });
        }
      };
    
      return ({target, parent, time, innerHTML, child, children, numStars = 125, id}) => {
        const parsedTime = parseTime(time);
        const previousTime = !(id && id in GoctiTimeGizmoMemory)
          ? null
          : GoctiTimeGizmoMemory[id];
        
        const progress = previousTime ?? parsedTime;
        const containers = getContainer({target, parent});
        GoctiTimeGizmoMemory[id] = parsedTime;

        containers.forEach((container) => {
          updateEl(container, {
            style: {'--gtg-day-progress': progress},
            classList: ['gtg-time-widget'],
            children: [
              create('div', {classList: 'gtg-sky', children: [
                create('div', {classList: 'gtg-next-sky'}),
                create('div', {classList: 'gtg-stars', children: createStars({numStars})}),
                create('div', {classList: 'gtg-sun-moon', children: [
                  create('div', {classList: 'gtg-moon'}),
                  create('div', {classList: 'gtg-sun'}),
                ]}),
              ]}),
              create('div', {classList: 'gtg-ground'}),
              create('div', {
                classList: 'gtg-content',
                children: child ? [child] : children ?? [],
                innerHTML,
              }),
            ]
          })
        });

        if (previousTime !== null) {
          const to = parsedTime + ((parsedTime < previousTime) ? 1000 : 0);
          const diff = to - previousTime;
          const start = Date.now();
          const animationFrame = () => {
            const now = Date.now();
            const elapsed = Math.min(1, (now - start) / (diff * 2));
            const progressNow = previousTime + easeInOutQuad(elapsed) * diff;
            containers.forEach((container) => container.style.setProperty(
              '--gtg-day-progress',
              progressNow,
            ));
            if (elapsed < 1) requestAnimationFrame(animationFrame);
          };
          animationFrame();
        }
      };
    })();

    const wrapper = document.createElement('div');
    this.output.appendChild(wrapper);
    
    const payload = document.createElement('div');
    $(payload).wiki(this.payload[0].contents);

    const rawArg = this.args.raw;
    createGoctiTimeWidget({
      target: wrapper,
      time: this.args[0] || State.getVar('$time'),
      numStars: 125,
      child: payload,
      id: rawArg,
    });
  }
});
