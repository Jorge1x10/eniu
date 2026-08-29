import { useState } from 'react'
import { Link } from '../router.jsx'
import { appUrl } from '../data/site.js'
import {
  COLOR_CONTROLS,
  DEMO_FONTS,
  DEMO_FONTS_HREF,
  DEMO_TEMPLATES,
  FREE_PRODUCT_LIMIT,
  PHOTO_STYLES,
  initialDemo,
} from '../data/demoMenu.js'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

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
function buildSections(menu) {
  const sections = menu.categories.map((category) => ({
    id: category.id,
    name: category.name,
    products: menu.products.filter((product) => product.categoryId === category.id),
  }))
  const loose = menu.products.filter((product) => !product.categoryId)
  if (loose.length) sections.push({ id: 'other', name: 'Otros', products: loose })
  return sections.filter((section) => section.products.length)
}

const TABS = [['menu', 'Menú'], ['productos', 'Productos'], ['diseno', 'Diseño']]

export default function MenuDemo() {
  const [menu, setMenu] = useState(initialDemo)
  const [tab, setTab] = useState('menu')
  const [editingId, setEditingId] = useState(null)

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
    patch({ categories: [...menu.categories, { id: newId(), name: 'Nueva categoría' }] })
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
        name: 'Producto nuevo',
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
    setMenu(initialDemo())
    setEditingId(null)
  }

  const atLimit = menu.products.length >= FREE_PRODUCT_LIMIT

  return (
    <div className="demo-shell">
      <div className="demo-editor">
        <div className="demo-tabs" role="tablist" aria-label="Editor del menú de ejemplo">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" role="tab" id={`demo-tab-${key}`} aria-selected={tab === key} aria-controls={`demo-panel-${key}`}
              className={tab === key ? 'demo-tab current' : 'demo-tab'} onClick={() => openTab(key)}>{label}</button>
          ))}
        </div>

        {tab === 'menu' && (
          <div className="demo-panel" role="tabpanel" id="demo-panel-menu" aria-labelledby="demo-tab-menu">
            <div className="demo-field">
              <label htmlFor="demo-business">Nombre del negocio</label>
              <input id="demo-business" className="demo-input" maxLength={64} value={menu.business.name}
                onChange={(event) => patch({ business: { name: event.target.value } })} />
            </div>
            <div className="demo-field">
              <label htmlFor="demo-catalogue">Nombre del menú</label>
              <input id="demo-catalogue" className="demo-input" maxLength={64} value={menu.catalogue.name}
                onChange={(event) => patch({ catalogue: { ...menu.catalogue, name: event.target.value } })} />
            </div>
            <div className="demo-field">
              <label htmlFor="demo-description">Descripción</label>
              <textarea id="demo-description" className="demo-input" rows={2} maxLength={160} value={menu.catalogue.description}
                onChange={(event) => patch({ catalogue: { ...menu.catalogue, description: event.target.value } })} />
            </div>
            <div className="demo-field">
              <span className="demo-label">Categorías</span>
              <div className="demo-cats">
                {menu.categories.map((category) => (
                  <div className="demo-cat" key={category.id}>
                    <input className="demo-input" aria-label={`Nombre de la categoría ${category.name}`} maxLength={40} value={category.name}
                      onChange={(event) => patch({ categories: menu.categories.map((item) => item.id === category.id ? { ...item, name: event.target.value } : item) })} />
                    <button type="button" className="demo-icon-button" aria-label={`Eliminar ${category.name}`} onClick={() => removeCategory(category.id)}>×</button>
                  </div>
                ))}
              </div>
              <button type="button" className="demo-add" onClick={addCategory}>+ Agregar categoría</button>
            </div>
          </div>
        )}

        {tab === 'productos' && (
          <div className="demo-panel" role="tabpanel" id="demo-panel-productos" aria-labelledby="demo-tab-productos">
            <div className="demo-panel-head">
              <p className="demo-count">{menu.products.length} de {FREE_PRODUCT_LIMIT} productos <span>plan Básico</span></p>
              <button type="button" className="demo-primary" onClick={addProduct} disabled={atLimit}>+ Agregar producto</button>
            </div>
            {atLimit && (
              <p className="demo-plan-note">Llegaste al tope del plan Básico. <Link href="/#planes">Con Esencial son ilimitados.</Link></p>
            )}
            <ul className="demo-products">
              {menu.products.map((product) => {
                const open = editingId === product.id
                return (
                  <li className={open ? 'demo-product open' : 'demo-product'} key={product.id}>
                    <div className="demo-product-head">
                      <span className={`demo-art demo-thumb art-${product.art}`} aria-hidden="true" />
                      <div className="demo-product-name">
                        <strong>{product.name || 'Sin nombre'}</strong>
                        <span>{product.price ? currency.format(Number(product.price)) : 'Sin precio'} · {product.available ? 'Disponible' : 'Agotado'}</span>
                      </div>
                      <button type="button" className="demo-mini" aria-expanded={open} onClick={() => setEditingId(open ? null : product.id)}>{open ? 'Listo' : 'Editar'}</button>
                      <button type="button" className="demo-icon-button" aria-label={`Eliminar ${product.name}`} onClick={() => removeProduct(product.id)}>×</button>
                    </div>
                    {open && (
                      <div className="demo-product-form">
                        <div className="demo-field">
                          <label htmlFor={`name-${product.id}`}>Nombre</label>
                          <input id={`name-${product.id}`} className="demo-input" maxLength={64} value={product.name}
                            onChange={(event) => patchProduct(product.id, { name: event.target.value })} />
                        </div>
                        <div className="demo-field">
                          <label htmlFor={`price-${product.id}`}>Precio (MXN)</label>
                          <input id={`price-${product.id}`} className="demo-input" inputMode="decimal" value={product.price}
                            onChange={(event) => patchProduct(product.id, { price: event.target.value.replace(/[^\d.]/g, '') })} />
                        </div>
                        <div className="demo-field wide">
                          <label htmlFor={`desc-${product.id}`}>Descripción</label>
                          <input id={`desc-${product.id}`} className="demo-input" maxLength={120} value={product.description}
                            onChange={(event) => patchProduct(product.id, { description: event.target.value })} />
                        </div>
                        <div className="demo-field">
                          <label htmlFor={`cat-${product.id}`}>Categoría</label>
                          <select id={`cat-${product.id}`} className="demo-input" value={product.categoryId || ''}
                            onChange={(event) => patchProduct(product.id, { categoryId: event.target.value || null })}>
                            <option value="">Sin categoría</option>
                            {menu.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                          </select>
                        </div>
                        <div className="demo-field">
                          <span className="demo-label">Fotografía</span>
                          <button type="button" className="demo-mini wide-button" onClick={() => nextPhoto(product)}>Cambiar fotografía</button>
                        </div>
                        <label className="demo-toggle wide">
                          <span>Disponible</span>
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
              <span className="demo-label">Plantilla</span>
              <div className="demo-templates">
                {DEMO_TEMPLATES.map((template) => (
                  <button key={template.key} type="button" aria-pressed={menu.templateKey === template.key}
                    className={menu.templateKey === template.key ? 'demo-template current' : 'demo-template'}
                    onClick={() => patch({ templateKey: template.key })}>
                    <strong>{template.name}{!template.free && <em className="demo-tag">Esencial</em>}</strong>
                    <span>{template.description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="demo-field">
              <label htmlFor="demo-font">Tipografía</label>
              <select id="demo-font" className="demo-input" value={menu.theme.font_key}
                onChange={(event) => patchTheme('font_key', event.target.value)}>
                {DEMO_FONTS.map((font) => <option key={font.key} value={font.key}>{font.label}{font.free ? '' : ' · Esencial'}</option>)}
              </select>
            </div>
            <div className="demo-field">
              <span className="demo-label">Colores</span>
              <div className="demo-colors">
                {COLOR_CONTROLS.map(([field, label]) => (
                  <div className="demo-color" key={field}>
                    <label htmlFor={`demo-${field}`}>{label}</label>
                    <div>
                      <input type="color" aria-label={`Selector de ${label.toLowerCase()}`} value={menu.theme[field]}
                        onChange={(event) => patchTheme(field, event.target.value.toUpperCase())} />
                      <input id={`demo-${field}`} className="demo-input hex" maxLength={7} value={menu.theme[field]}
                        onChange={(event) => patchTheme(field, event.target.value.toUpperCase())} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="demo-field">
              <span className="demo-label">Portada y productos</span>
              <label className="demo-toggle">
                <span>Mostrar portada <em className="demo-tag">Esencial</em></span>
                <input type="checkbox" checked={menu.theme.show_cover} onChange={(event) => patchTheme('show_cover', event.target.checked)} />
              </label>
              <label className="demo-toggle">
                <span>Mostrar imágenes de productos</span>
                <input type="checkbox" checked={menu.theme.show_product_images} onChange={(event) => patchTheme('show_product_images', event.target.checked)} />
              </label>
            </div>
          </div>
        )}

        <div className="demo-foot">
          <p>Los cambios se ven al instante, igual que en Eniu. Esta demo no guarda nada.</p>
          <button type="button" className="demo-mini" onClick={reset}>Reiniciar demo</button>
        </div>
      </div>

      <div className="demo-preview">
        <div className="demo-phone">
          <span className="demo-notch" aria-hidden="true" />
          <div className="demo-screen" aria-label="Vista previa del menú de ejemplo">
            <MenuPreview menu={menu} />
          </div>
        </div>
        <p className="demo-caption">Así lo ven tus clientes al escanear el QR.</p>
        <a className="button primary" href={appUrl}>Crear mi menú gratis</a>
      </div>
    </div>
  )
}

function MenuPreview({ menu }) {
  const [selected, setSelected] = useState('all')
  const sections = buildSections(menu)
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
        <div className="demo-menu-cover" style={{ backgroundColor: theme.primary_color }}>{menu.business.name || 'Tu negocio'}</div>
      )}
      <header className="demo-menu-head">
        <p>{menu.business.name || 'Tu negocio'}</p>
        <h3>{menu.catalogue.name || 'Tu menú'}</h3>
        {menu.catalogue.description && <p className="demo-menu-desc">{menu.catalogue.description}</p>}
      </header>
      {sections.length > 0 && (
        <nav className="demo-menu-nav" aria-label="Categorías del menú">
          {[{ id: 'all', name: 'Todo' }, ...sections].map((section) => (
            <button key={section.id} type="button" aria-pressed={active === section.id} onClick={() => setSelected(section.id)}
              style={active === section.id ? { backgroundColor: theme.primary_color, borderColor: theme.accent_color } : undefined}>{section.name}</button>
          ))}
        </nav>
      )}
      {sections.length === 0 ? (
        <p className="demo-menu-empty">Los productos aparecerán aquí cuando los agregues.</p>
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
                      <h5>{product.name || 'Sin nombre'}{!product.available && <em>Agotado</em>}</h5>
                      {product.description && <p>{product.description}</p>}
                      <strong>{product.price ? currency.format(Number(product.price)) : 'Consultar'}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <footer className="demo-menu-badge">Menú creado con ENIU</footer>
    </div>
  )
}
