import { useMemo, useState } from 'react'
import { Link } from '../router.jsx'
import { useLanguage } from '../languageContext.js'
import { appUrl } from '../data/site.js'
import {
  COLOR_FIELDS,
  DEMO_FONTS,
  DEMO_FONTS_HREF,
  DEMO_TEMPLATES,
  FREE_PRODUCT_LIMIT,
  PHOTO_STYLES,
  initialDemo,
} from '../data/demoMenu.js'

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : `demo-${Math.random().toString(16).slice(2)}`
}

function loadDemoFonts() {
  if (document.getElementById('demo-fonts')) return
  const link = document.createElement('link')
  link.id = 'demo-fonts'
  link.rel = 'stylesheet'
  link.href = DEMO_FONTS_HREF
  document.head.append(link)
}

/** Agrupa por categoría igual que el menú público: lo suelto va en "Otros". */
function buildSections(menu, otherLabel) {
  const sections = menu.categories.map((category) => ({
    id: category.id,
    name: category.name,
    products: menu.products.filter((product) => product.categoryId === category.id),
  }))
  const loose = menu.products.filter((product) => !product.categoryId)
  if (loose.length) sections.push({ id: 'other', name: otherLabel, products: loose })
  return sections.filter((section) => section.products.length)
}

export default function MenuDemo() {
  const { demo } = useLanguage().content
  const { fields, preview } = demo

  // La demo se resiembra al cambiar de idioma porque su contenido es copy:
  // dejar un menú en español dentro de la página en inglés delataría que la
  // traducción es superficial.
  const [menu, setMenu] = useState(() => initialDemo(demo.seed))
  const [tab, setTab] = useState('menu')
  const [editingId, setEditingId] = useState(null)
  const [seed, setSeed] = useState(demo.seed)

  if (seed !== demo.seed) {
    setSeed(demo.seed)
    setMenu(initialDemo(demo.seed))
    setEditingId(null)
  }

  const currency = useMemo(
    () => new Intl.NumberFormat(demo.locale, { style: 'currency', currency: demo.currency }),
    [demo.locale, demo.currency],
  )

  const patch = (changes) => setMenu((current) => ({ ...current, ...changes }))
  const patchTheme = (field, value) => setMenu((current) => ({ ...current, theme: { ...current.theme, [field]: value } }))
  const patchProduct = (id, changes) => setMenu((current) => ({
    ...current,
    products: current.products.map((product) => product.id === id ? { ...product, ...changes } : product),
  }))

  function openTab(key) {
    setTab(key)
    if (key === 'diseno') loadDemoFonts()
  }

  function addCategory() {
    patch({ categories: [...menu.categories, { id: newId(), name: demo.seed.newCategory }] })
  }

  function removeCategory(id) {
    setMenu((current) => ({
      ...current,
      categories: current.categories.filter((category) => category.id !== id),
      products: current.products.map((product) => product.categoryId === id ? { ...product, categoryId: null } : product),
    }))
  }

  function addProduct() {
    const id = newId()
    setMenu((current) => ({
      ...current,
      products: [...current.products, {
        id,
        name: demo.seed.newProduct,
        description: '',
        price: '',
        categoryId: current.categories[0]?.id || null,
        available: true,
        art: PHOTO_STYLES[current.products.length % PHOTO_STYLES.length],
      }],
    }))
    setEditingId(id)
  }

  function removeProduct(id) {
    setMenu((current) => ({ ...current, products: current.products.filter((product) => product.id !== id) }))
    if (editingId === id) setEditingId(null)
  }

  function nextPhoto(product) {
    const index = PHOTO_STYLES.indexOf(product.art)
    patchProduct(product.id, { art: PHOTO_STYLES[(index + 1) % PHOTO_STYLES.length] })
  }

  function reset() {
    setMenu(initialDemo(demo.seed))
    setEditingId(null)
  }

  const atLimit = menu.products.length >= FREE_PRODUCT_LIMIT

  return (
    <div className="demo-shell">
      <div className="demo-editor">
        <div className="demo-tabs" role="tablist" aria-label={demo.editorLabel}>
          {demo.tabs.map(([key, label]) => (
            <button key={key} type="button" role="tab" id={`demo-tab-${key}`} aria-selected={tab === key} aria-controls={`demo-panel-${key}`}
              className={tab === key ? 'demo-tab current' : 'demo-tab'} onClick={() => openTab(key)}>{label}</button>
          ))}
        </div>

        {tab === 'menu' && (
          <div className="demo-panel" role="tabpanel" id="demo-panel-menu" aria-labelledby="demo-tab-menu">
            <div className="demo-field">
              <label htmlFor="demo-business">{fields.businessName}</label>
              <input id="demo-business" className="demo-input" maxLength={64} value={menu.business.name}
                onChange={(event) => patch({ business: { name: event.target.value } })} />
            </div>
            <div className="demo-field">
              <label htmlFor="demo-catalogue">{fields.menuName}</label>
              <input id="demo-catalogue" className="demo-input" maxLength={64} value={menu.catalogue.name}
                onChange={(event) => patch({ catalogue: { ...menu.catalogue, name: event.target.value } })} />
            </div>
            <div className="demo-field">
              <label htmlFor="demo-description">{fields.description}</label>
              <textarea id="demo-description" className="demo-input" rows={2} maxLength={160} value={menu.catalogue.description}
                onChange={(event) => patch({ catalogue: { ...menu.catalogue, description: event.target.value } })} />
            </div>
            <div className="demo-field">
              <span className="demo-label">{fields.categories}</span>
              <div className="demo-cats">
                {menu.categories.map((category) => (
                  <div className="demo-cat" key={category.id}>
                    <input className="demo-input" aria-label={fields.categoryNameLabel(category.name)} maxLength={40} value={category.name}
                      onChange={(event) => patch({ categories: menu.categories.map((item) => item.id === category.id ? { ...item, name: event.target.value } : item) })} />
                    <button type="button" className="demo-icon-button" aria-label={fields.remove(category.name)} onClick={() => removeCategory(category.id)}>×</button>
                  </div>
                ))}
              </div>
              <button type="button" className="demo-add" onClick={addCategory}>{fields.addCategory}</button>
            </div>
          </div>
        )}

        {tab === 'productos' && (
          <div className="demo-panel" role="tabpanel" id="demo-panel-productos" aria-labelledby="demo-tab-productos">
            <div className="demo-panel-head">
              <p className="demo-count">{fields.counter(menu.products.length, FREE_PRODUCT_LIMIT)} <span>{fields.counterPlan}</span></p>
              <button type="button" className="demo-primary" onClick={addProduct} disabled={atLimit}>{fields.addProduct}</button>
            </div>
            {atLimit && (
              <p className="demo-plan-note">{fields.atLimit}<Link href="#planes">{fields.atLimitLink}</Link></p>
            )}
            <ul className="demo-products">
              {menu.products.map((product) => {
                const open = editingId === product.id
                return (
                  <li className={open ? 'demo-product open' : 'demo-product'} key={product.id}>
                    <div className="demo-product-head">
                      <span className={`demo-art demo-thumb art-${product.art}`} aria-hidden="true" />
                      <div className="demo-product-name">
                        <strong>{product.name || fields.unnamed}</strong>
                        <span>{product.price ? currency.format(Number(product.price)) : fields.noPrice} · {product.available ? fields.available : fields.soldOut}</span>
                      </div>
                      <button type="button" className="demo-mini" aria-expanded={open} onClick={() => setEditingId(open ? null : product.id)}>{open ? fields.done : fields.edit}</button>
                      <button type="button" className="demo-icon-button" aria-label={fields.remove(product.name)} onClick={() => removeProduct(product.id)}>×</button>
                    </div>
                    {open && (
                      <div className="demo-product-form">
                        <div className="demo-field">
                          <label htmlFor={`name-${product.id}`}>{fields.name}</label>
                          <input id={`name-${product.id}`} className="demo-input" maxLength={64} value={product.name}
                            onChange={(event) => patchProduct(product.id, { name: event.target.value })} />
                        </div>
                        <div className="demo-field">
                          <label htmlFor={`price-${product.id}`}>{fields.price}</label>
                          <input id={`price-${product.id}`} className="demo-input" inputMode="decimal" value={product.price}
                            onChange={(event) => patchProduct(product.id, { price: event.target.value.replace(/[^\d.]/g, '') })} />
                        </div>
                        <div className="demo-field wide">
                          <label htmlFor={`desc-${product.id}`}>{fields.description}</label>
                          <input id={`desc-${product.id}`} className="demo-input" maxLength={120} value={product.description}
                            onChange={(event) => patchProduct(product.id, { description: event.target.value })} />
                        </div>
                        <div className="demo-field">
                          <label htmlFor={`cat-${product.id}`}>{fields.category}</label>
                          <select id={`cat-${product.id}`} className="demo-input" value={product.categoryId || ''}
                            onChange={(event) => patchProduct(product.id, { categoryId: event.target.value || null })}>
                            <option value="">{fields.noCategory}</option>
                            {menu.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                          </select>
                        </div>
                        <div className="demo-field">
                          <span className="demo-label">{fields.photo}</span>
                          <button type="button" className="demo-mini wide-button" onClick={() => nextPhoto(product)}>{fields.changePhoto}</button>
                        </div>
                        <label className="demo-toggle wide">
                          <span>{fields.available}</span>
                          <input type="checkbox" checked={product.available} onChange={(event) => patchProduct(product.id, { available: event.target.checked })} />
                        </label>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {tab === 'diseno' && (
          <div className="demo-panel" role="tabpanel" id="demo-panel-diseno" aria-labelledby="demo-tab-diseno">
            <div className="demo-field">
              <span className="demo-label">{fields.template}</span>
              <div className="demo-templates">
                {DEMO_TEMPLATES.map((template) => (
                  <button key={template.key} type="button" aria-pressed={menu.templateKey === template.key}
                    className={menu.templateKey === template.key ? 'demo-template current' : 'demo-template'}
                    onClick={() => patch({ templateKey: template.key })}>
                    <strong>{demo.templates[template.key].name}{!template.free && <em className="demo-tag">{fields.paidTag}</em>}</strong>
                    <span>{demo.templates[template.key].description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="demo-field">
              <label htmlFor="demo-font">{fields.font}</label>
              <select id="demo-font" className="demo-input" value={menu.theme.font_key}
                onChange={(event) => patchTheme('font_key', event.target.value)}>
                {DEMO_FONTS.map((font) => <option key={font.key} value={font.key}>{font.label}{font.free ? '' : ` · ${fields.paidTag}`}</option>)}
              </select>
            </div>
            <div className="demo-field">
              <span className="demo-label">{fields.colors}</span>
              <div className="demo-colors">
                {COLOR_FIELDS.map((field) => (
                  <div className="demo-color" key={field}>
                    <label htmlFor={`demo-${field}`}>{demo.colors[field]}</label>
                    <div>
                      <input type="color" aria-label={fields.colorPicker(demo.colors[field])} value={menu.theme[field]}
                        onChange={(event) => patchTheme(field, event.target.value.toUpperCase())} />
                      <input id={`demo-${field}`} className="demo-input hex" maxLength={7} value={menu.theme[field]}
                        onChange={(event) => patchTheme(field, event.target.value.toUpperCase())} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="demo-field">
              <span className="demo-label">{fields.coverAndProducts}</span>
              <label className="demo-toggle">
                <span>{fields.showCover} <em className="demo-tag">{fields.paidTag}</em></span>
                <input type="checkbox" checked={menu.theme.show_cover} onChange={(event) => patchTheme('show_cover', event.target.checked)} />
              </label>
              <label className="demo-toggle">
                <span>{fields.showProductImages}</span>
                <input type="checkbox" checked={menu.theme.show_product_images} onChange={(event) => patchTheme('show_product_images', event.target.checked)} />
              </label>
            </div>
          </div>
        )}

        <div className="demo-foot">
          <p>{demo.note}</p>
          <button type="button" className="demo-mini" onClick={reset}>{demo.reset}</button>
        </div>
      </div>

      <div className="demo-preview">
        <div className="demo-phone">
          <span className="demo-notch" aria-hidden="true" />
          <div className="demo-screen" aria-label={preview.label}>
            <MenuPreview menu={menu} preview={preview} fields={fields} currency={currency} />
          </div>
        </div>
        <p className="demo-caption">{preview.caption}</p>
        <a className="button primary" href={appUrl}>{preview.cta}</a>
      </div>
    </div>
  )
}

function MenuPreview({ menu, preview, fields, currency }) {
  const [selected, setSelected] = useState('all')
  const sections = buildSections(menu, preview.other)
  const active = sections.some((section) => section.id === selected) ? selected : 'all'
  const visible = active === 'all' ? sections : sections.filter((section) => section.id === active)
  const { theme } = menu
  const font = DEMO_FONTS.find((item) => item.key === theme.font_key) || DEMO_FONTS[0]

  return (
    <div className={`demo-menu tpl-${menu.templateKey}`} style={{
      backgroundColor: theme.background_color,
      color: theme.text_color,
      fontFamily: font.family,
      '--menu-primary': theme.primary_color,
      '--menu-accent': theme.accent_color,
    }}>
      {theme.show_cover && (
        <div className="demo-menu-cover" style={{ backgroundColor: theme.primary_color }}>{menu.business.name || preview.fallbackBusiness}</div>
      )}
      <header className="demo-menu-head">
        <p>{menu.business.name || preview.fallbackBusiness}</p>
        <h3>{menu.catalogue.name || preview.fallbackMenu}</h3>
        {menu.catalogue.description && <p className="demo-menu-desc">{menu.catalogue.description}</p>}
      </header>
      {sections.length > 0 && (
        <nav className="demo-menu-nav" aria-label={preview.navLabel}>
          {[{ id: 'all', name: preview.all }, ...sections].map((section) => (
            <button key={section.id} type="button" aria-pressed={active === section.id} onClick={() => setSelected(section.id)}
              style={active === section.id ? { backgroundColor: theme.primary_color, borderColor: theme.accent_color } : undefined}>{section.name}</button>
          ))}
        </nav>
      )}
      {sections.length === 0 ? (
        <p className="demo-menu-empty">{preview.empty}</p>
      ) : (
        <div className="demo-menu-body">
          {visible.map((section) => (
            <section key={section.id}>
              <h4>{section.name}</h4>
              <div className="demo-menu-grid">
                {section.products.map((product) => (
                  <article className={product.available ? 'demo-dish' : 'demo-dish out'} key={product.id}
                    style={{ backgroundColor: theme.background_color, borderColor: `${theme.text_color}1f` }}>
                    {theme.show_product_images && <span className={`demo-art demo-dish-art art-${product.art}`} aria-hidden="true" />}
                    <div>
                      <h5>{product.name || fields.unnamed}{!product.available && <em>{fields.soldOut}</em>}</h5>
                      {product.description && <p>{product.description}</p>}
                      <strong>{product.price ? currency.format(Number(product.price)) : preview.askPrice}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <footer className="demo-menu-badge">{preview.badge}</footer>
    </div>
  )
}
