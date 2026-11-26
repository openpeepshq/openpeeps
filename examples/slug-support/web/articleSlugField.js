/*
 * Slug support — article editor slot (web).
 *
 * Hand-written IIFE bundle registered against the `plugins.articles.editor.slug`
 * slot. Served at /plugin-assets/examples/slug-support/web/articleSlugField.js
 * and script-tagged by the web PluginLoader — no build step, no dependencies
 * (React is provided globally by the host app).
 *
 * Strings come from the host bundle's `articles.form.*` keys (platform/i18n);
 * the defaultValue arguments keep the field usable if the locale is stale.
 */
(function () {
  if (typeof window === 'undefined' || !window.React || !window.__OPENPEEPS_PLUGINS__) {
    return;
  }

  var React = window.React;
  var API_BASE = '/api/openpeeps/core/v1/plugins/examples/slug-support';
  var MAX_LENGTH = 100;
  // The host (PluginRegistryProvider) assigns an authenticated `fetch` onto the
  // plugins global alongside React — the app uses a Bearer token, not cookies,
  // so a bare `fetch(..., { credentials: 'include' })` would send nothing.
  var authFetch = window.__OPENPEEPS_PLUGINS__.authFetch || window.fetch;

  var tr = function (t, key, defaultValue) {
    var fn = t || function (_k, d) {
      return d;
    };
    return fn(key, { defaultValue: defaultValue });
  };

  function useDebounced(fn, delay) {
    var fnRef = React.useRef(fn);
    fnRef.current = fn;
    var timer = React.useRef(null);
    var cancel = React.useCallback(function () {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    }, []);
    var schedule = React.useCallback(
      function (args) {
        cancel();
        timer.current = setTimeout(function () {
          timer.current = null;
          fnRef.current(args);
        }, delay);
      },
      [cancel, delay]
    );
    React.useEffect(function () {
      return cancel;
    }, [cancel]);
    return schedule;
  }

  function ArticleSlugField(props) {
    var t = props.translate;
    var article = (props.postData && props.postData.data) || {};
    var isEdit = props.isEdit;
    // The host does not pass profile info as slot props, so the asset asks its
    // own `GET /profile` endpoint (the documented way for this asset to learn
    // who it is and whether it may use an instance-scoped slug). Until it
    // resolves, `me` is '' and `canInstance` is false — the scope radio is
    // disabled and checks fall back to instance-wide, matching the host.
    var _profile = React.useState(null);
    var profile = _profile[0];
    var setProfile = _profile[1];

    var canInstance = profile ? profile.canInstance === true : false;
    var me = profile ? profile.handle || '' : '';

    React.useEffect(function () {
      var cancelled = false;
      authFetch(API_BASE + '/profile')
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (payload) {
          if (cancelled) return;
          if (payload && payload.success && payload.data) {
            setProfile(payload.data);
          }
        })
        .catch(function () {});
      return function () {
        cancelled = true;
      };
    }, []);

    var slug = article.slug || '';
    var instanceScoped = article.instanceScoped === true;
    var hasSlug = slug.length > 0;

    var _state = React.useState(article.autoGenerate === true);
    var autoGenerate = _state[0];
    var setAutoGenerate = _state[1];

    var _status = React.useState('idle');
    var status = _status[0]; // 'idle' | 'checking' | 'available' | 'taken' | 'error'
    var setStatus = _status[1];
    var statusNonce = React.useRef(0);
    var slugRef = React.useRef('');
    slugRef.current = slug;

    var lastChecked = React.useRef(null);
    var lastScope = React.useRef(null);

    var check = React.useCallback(
      function (next) {
        var value = (next || slugRef.current || '').trim().toLowerCase();
        if (!value) {
          setStatus('idle');
          return;
        }
        if (
          lastChecked.current === value &&
          lastScope.current === (instanceScoped ? 'instance' : me)
        ) {
          return;
        }
        lastChecked.current = value;
        lastScope.current = instanceScoped ? 'instance' : me;
        var nonce = ++statusNonce.current;
        setStatus('checking');
        var params = new URLSearchParams();
        params.set('slug', value);
        if (instanceScoped) {
          params.set('instanceScoped', 'true');
        } else if (me) {
          params.set('profile', me);
        }
        authFetch(API_BASE + '/check?' + params.toString())
          .then(function (r) {
            return r.json();
          })
          .then(function (data) {
            if (nonce !== statusNonce.current) {
              return;
            }
            if (data && data.error) {
              setStatus('error');
              return;
            }
            setStatus(data && data.available ? 'available' : 'taken');
          })
          .catch(function () {
            if (nonce === statusNonce.current) {
              setStatus('error');
            }
          });
      },
      [instanceScoped, me]
    );

    var scheduleCheck = useDebounced(check, 300);
    React.useEffect(function () {
      if (hasSlug) {
        scheduleCheck();
      } else {
        statusNonce.current++;
        setStatus('idle');
        lastChecked.current = null;
      }
    }, [slug, instanceScoped, me]);

    var patch = function (next) {
      props.onChange({
        ...article,
        slug: next,
      });
    };

    var handleInputChange = function (e) {
      var raw = e.target.value || '';
      var value = raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, MAX_LENGTH);
      patch(value);
      scheduleCheck(value);
    };

    var handleBlur = function () {
      if (autoGenerate && !hasSlug && article.title) {
        authFetch(API_BASE + '/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: article.title,
            instanceScoped: instanceScoped || undefined,
          }),
        })
          .then(function (r) {
            return r.json();
          })
          .then(function (data) {
            var generated = (data && data.slug) || '';
            if (generated) {
              patch(generated);
              lastChecked.current = null;
              check(generated);
            }
          })
          .catch(function () {});
      }
    };

    var setScope = function (next) {
      props.onChange({
        ...article,
        instanceScoped: next || undefined,
      });
    };

    var handleToggleInstance = function (e) {
      if (!canInstance && e.target.checked) {
        return;
      }
      setScope(e.target.checked);
    };

    var statusMeta = {
      idle: null,
      checking: tr(t, 'articles.form.checking', 'Checking…'),
      available: tr(t, 'articles.form.available', 'Available'),
      taken: tr(t, 'articles.form.taken', 'Taken'),
      error: null,
    };
    var statusColor = {
      idle: 'text-slate-500',
      checking: 'text-amber-500',
      available: 'text-emerald-600',
      taken: 'text-red-500',
      error: 'text-slate-400',
    };

    return React.createElement(
      'div',
      {
        className:
          'rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900',
      },
      React.createElement('div', { className: 'space-y-3' },
        // slug input
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement('span', {
            className: 'text-sm text-slate-600 dark:text-slate-300',
          }, '/'),
          React.createElement('input', {
            type: 'text',
            value: slug,
            onChange: handleInputChange,
            onBlur: handleBlur,
            placeholder: tr(t, 'articles.form.slugPlaceholder', 'my-article'),
            'aria-label': tr(t, 'articles.form.slug', 'Slug (optional)'),
            maxLength: MAX_LENGTH,
            className:
              'flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
          }),
          hasSlug &&
            statusMeta[status] !== null &&
            React.createElement('span', {
              className: 'text-xs font-medium ' + statusColor[status],
            }, statusMeta[status])
        ),
        // scope
        React.createElement('div', { className: 'flex items-center gap-4 text-sm' },
          React.createElement('label', { className: 'flex items-center gap-1' },
            React.createElement('input', {
              type: 'radio',
              name: 'slug-scope',
              checked: !instanceScoped,
              onChange: function () {
                setScope(false);
              },
              className: 'accent-blue-600',
            }),
            tr(t, 'articles.form.profileScoped', 'Profile-scoped (/@handle/slug)')
          ),
          React.createElement('label', { className: 'flex items-center gap-1' },
            React.createElement('input', {
              type: 'radio',
              name: 'slug-scope',
              checked: instanceScoped,
              disabled: !canInstance,
              onChange: handleToggleInstance,
              className: 'accent-blue-600',
            }),
            canInstance
              ? tr(t, 'articles.form.instanceScoped', 'Instance-wide (/{slug})')
              : tr(t, 'articles.form.requiresPermission', 'Requires permission')
          )
        ),
        // auto-generate
        React.createElement('label', { className: 'flex items-center gap-2 text-sm' },
          React.createElement('input', {
            type: 'checkbox',
            checked: autoGenerate,
            onChange: function (e) {
              setAutoGenerate(e.target.checked);
            },
            className: 'accent-blue-600',
          }),
          tr(t, 'articles.form.autoGenerate', 'Auto-generate from title on blur')
        ),
        // hint
        React.createElement('p', { className: 'text-xs text-slate-500' },
          isEdit
            ? tr(
                t,
                'articles.form.slugEditHint',
                'Changing the slug will update the article URL.'
              )
            : tr(
                t,
                'articles.form.slugHint',
                'A slug gives your article a clean, shareable URL.'
              )
        )
      )
    );
  }

  window.__OPENPEEPS_PLUGINS__.registerComponent(
    'plugins.articles.editor.slug',
    'examples/slug-support',
    ArticleSlugField
  );
})();
