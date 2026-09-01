import { createI18n } from 'vue-i18n'

const messages = {
  fr: {
    bulkImport: { chooseFile: 'Choisir un fichier', formats: 'Formats : CSV, JSON, Excel, SQL/Dump, Access (.mdb/.accdb)', paste: 'Collez ici un CSV ou un JSON', preview: 'Aperçu : {count} ligne(s)', importing: 'Importation...', importRows: 'Importer {count} ligne(s)' },
    language: 'Langue',
    brand: { name: 'School Store', tagline: 'gestion scolaire' },
    theme: { label: 'Apparence', system: 'Système', light: 'Clair', dark: 'Sombre' },
    layout: { openMenu: 'Ouvrir le menu', closeMenu: 'Fermer le menu' },
    languages: { fr: 'Français', en: 'English', es: 'Español', ar: 'العربية' },
    nav: { dashboard: 'Tableau de bord', products: 'Produits', categories: 'Catégories', clients: 'Clients', newInvoice: 'Nouvelle facture', invoices: 'Factures' },
    pages: { dashboard: 'Tableau de bord', products: 'Gestion des produits', categories: 'Gestion des catégories', clients: 'Gestion des clients', newInvoice: 'Nouvelle facture', invoices: 'Historique des factures', detail: 'Détail de la facture' },
    actions: { logout: 'Déconnexion', recent: 'Dernières factures', viewAll: 'Voir tout', refresh: 'Actualiser' },
    dashboard: { products: 'Produits', categories: 'Catégories', clients: 'Clients', invoices: 'Factures totales', pending: 'Factures en attente', revenue: "Chiffre d'affaires", createInvoice: 'Créer une facture', manageProducts: 'Gérer les produits', manageClients: 'Gérer les clients', history: "Voir l'historique", noInvoices: 'Aucune facture' },
    status: { paid: 'Payée', pending: 'En attente', cancelled: 'Annulée' },
    common: { save: 'Enregistrer', cancel: 'Annuler', edit: 'Modifier', delete: 'Supprimer', loading: 'Chargement...', none: 'Aucun', search: 'Rechercher', import: 'Importer en masse', importHint: 'Vous pouvez aussi coller les données manuellement. La première ligne CSV doit contenir les noms des colonnes.', create: 'Créer', close: 'Fermer', name: 'Nom', email: 'Email', phone: 'Téléphone', address: 'Adresse', description: 'Description', notes: 'Notes', price: 'Prix', stock: 'Stock', barcode: 'Code-barres', category: 'Catégorie', image: 'Image', allStatuses: 'Tous les statuts', noResults: 'Aucun résultat', notFound: 'Page introuvable' },
    login: { subtitle: 'Connectez-vous pour continuer', signIn: 'Connexion', signUp: 'Inscription', fullName: 'Nom complet', role: 'Rôle', agent: 'Agent (caisse)', manager: 'Manager', password: 'Mot de passe', wait: 'Patientez...', submitSignIn: 'Se connecter', submitSignUp: 'Créer le compte', demo: 'Compte démo (SQLite)', adapter: 'Adapter actif' },
    productsView: { title: 'Produits', new: 'Nouveau produit', noProducts: 'Aucun produit', edit: 'Modifier le produit', newTitle: 'Nouveau produit', imageUrl: 'URL de l’image ou fichier', noCategory: 'Aucune', importing: 'Importer des produits', inStock: 'en stock' },
    categoriesView: { title: 'Catégories', new: 'Nouvelle catégorie', edit: 'Modifier la catégorie', importing: 'Importer des catégories' },
    clientsView: { title: 'Clients', new: 'Nouveau client', edit: 'Modifier le client', importing: 'Importer des clients', discount: 'Remise générale (%)', pricing: 'Tarif produit spécifique', noClients: 'Aucun client', noClient: 'Sans client' },
    invoicesView: { title: 'Historique des factures', search: 'Rechercher (n° facture, client...)', selectAll: 'Sélectionner toutes les factures', invoiceNumber: 'N° Facture', createdBy: 'Créée par', client: 'Client', date: 'Date', total: 'Total', status: 'Statut', actions: 'Actions', noInvoices: 'Aucune facture', view: 'Voir la facture', delete: 'Supprimer la facture', bulkDelete: 'Supprimer les factures sélectionnées', confirmDelete: 'Supprimer la facture {number} ?', confirmBulk: 'Supprimer {count} facture(s) sélectionnée(s) ?' },
    invoiceCreate: { productSearch: 'Rechercher par nom ou code-barres', clientSearch: 'Rechercher un client (nom, email ou téléphone)', selectedClient: 'Client sélectionné : {name}', customerName: 'Nom du client (optionnel)', empty: 'Le panier est vide', scanHint: 'Scannez un produit ou utilisez la saisie manuelle', clear: 'Vider', payment: 'Paiement', received: 'Montant reçu', change: 'Monnaie à rendre', remaining: 'Reste à payer', validate: 'Valider la facture', success: 'Facture validée avec succès !' },
    detail: { back: 'Retour', date: 'Date', customer: 'Client', createdBy: 'Créée par', status: 'Statut', product: 'Produit', quantity: 'Qté', unitPrice: 'Prix unit.', total: 'Total', print: 'Imprimer', paid: 'Payé', delete: 'Supprimer la facture' },
    scanner: { activate: 'Cliquez pour activer le scanner', start: 'Démarrer le scanner', retry: 'Réessayer', stop: 'Arrêter', manual: 'Saisie manuelle', code: 'Code-barres ou QR code', validate: 'Valider', last: 'Dernier code scanné' }
  },
  en: {
    bulkImport: { chooseFile: 'Choose a file', formats: 'Formats: CSV, JSON, Excel, SQL/Dump, Access (.mdb/.accdb)', paste: 'Paste CSV or JSON here', preview: 'Preview: {count} row(s)', importing: 'Importing...', importRows: 'Import {count} row(s)' },
    language: 'Language',
    brand: { name: 'School Store', tagline: 'school management' },
    theme: { label: 'Appearance', system: 'System', light: 'Light', dark: 'Dark' },
    layout: { openMenu: 'Open menu', closeMenu: 'Close menu' },
    languages: { fr: 'Français', en: 'English', es: 'Español', ar: 'العربية' },
    nav: { dashboard: 'Dashboard', products: 'Products', categories: 'Categories', clients: 'Clients', newInvoice: 'New invoice', invoices: 'Invoices' },
    pages: { dashboard: 'Dashboard', products: 'Product management', categories: 'Category management', clients: 'Client management', newInvoice: 'New invoice', invoices: 'Invoice history', detail: 'Invoice details' },
    actions: { logout: 'Sign out', recent: 'Recent invoices', viewAll: 'View all', refresh: 'Refresh' },
    dashboard: { products: 'Products', categories: 'Categories', clients: 'Clients', invoices: 'Total invoices', pending: 'Pending invoices', revenue: 'Revenue', createInvoice: 'Create invoice', manageProducts: 'Manage products', manageClients: 'Manage clients', history: 'View history', noInvoices: 'No invoices' },
    status: { paid: 'Paid', pending: 'Pending', cancelled: 'Cancelled' },
    common: { save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', loading: 'Loading...', none: 'None', search: 'Search', import: 'Bulk import', importHint: 'You can also paste data manually. The first CSV row must contain column names.', create: 'Create', close: 'Close', name: 'Name', email: 'Email', phone: 'Phone', address: 'Address', description: 'Description', notes: 'Notes', price: 'Price', stock: 'Stock', barcode: 'Barcode', category: 'Category', image: 'Image', allStatuses: 'All statuses', noResults: 'No results', notFound: 'Page not found' },
    login: { subtitle: 'Sign in to continue', signIn: 'Sign in', signUp: 'Sign up', fullName: 'Full name', role: 'Role', agent: 'Agent (cashier)', manager: 'Manager', password: 'Password', wait: 'Please wait...', submitSignIn: 'Sign in', submitSignUp: 'Create account', demo: 'Demo account (SQLite)', adapter: 'Active adapter' },
    productsView: { title: 'Products', new: 'New product', noProducts: 'No products', edit: 'Edit product', newTitle: 'New product', imageUrl: 'Image URL or file', noCategory: 'None', importing: 'Import products', inStock: 'In stock' },
    categoriesView: { title: 'Categories', new: 'New category', edit: 'Edit category', importing: 'Import categories' },
    clientsView: { title: 'Clients', new: 'New client', edit: 'Edit client', importing: 'Import clients', discount: 'General discount (%)', pricing: 'Specific product price', noClients: 'No clients', noClient: 'No client' },
    invoicesView: { title: 'Invoice history', search: 'Search (invoice no., client...)', selectAll: 'Select all invoices', invoiceNumber: 'Invoice no.', createdBy: 'Created by', client: 'Client', date: 'Date', total: 'Total', status: 'Status', actions: 'Actions', noInvoices: 'No invoices', view: 'View invoice', delete: 'Delete invoice', bulkDelete: 'Delete selected invoices', confirmDelete: 'Delete invoice {number}?', confirmBulk: 'Delete {count} selected invoice(s)?' },
    invoiceCreate: { productSearch: 'Search by name or barcode', clientSearch: 'Search a client (name, email or phone)', selectedClient: 'Selected client: {name}', customerName: 'Client name (optional)', empty: 'Cart is empty', scanHint: 'Scan a product or use manual entry', clear: 'Clear', payment: 'Payment', received: 'Amount received', change: 'Change', remaining: 'Remaining to pay', validate: 'Validate invoice', success: 'Invoice validated successfully!' },
    detail: { back: 'Back', date: 'Date', customer: 'Client', createdBy: 'Created by', status: 'Status', product: 'Product', quantity: 'Qty', unitPrice: 'Unit price', total: 'Total', print: 'Print', paid: 'Paid', delete: 'Delete invoice' },
    scanner: { activate: 'Click to activate scanner', start: 'Start scanner', retry: 'Retry', stop: 'Stop', manual: 'Manual entry', code: 'Barcode or QR code', validate: 'Validate', last: 'Last scanned code' }
  },
  es: {
    bulkImport: { chooseFile: 'Elegir un archivo', formats: 'Formatos: CSV, JSON, Excel, SQL/Dump, Access (.mdb/.accdb)', paste: 'Pega aquí un CSV o JSON', preview: 'Vista previa: {count} fila(s)', importing: 'Importando...', importRows: 'Importar {count} fila(s)' },
    language: 'Idioma',
    brand: { name: 'School Store', tagline: 'gestión escolar' },
    theme: { label: 'Apariencia', system: 'Sistema', light: 'Claro', dark: 'Oscuro' },
    layout: { openMenu: 'Abrir menú', closeMenu: 'Cerrar menú' },
    languages: { fr: 'Français', en: 'English', es: 'Español', ar: 'العربية' },
    nav: { dashboard: 'Panel', products: 'Productos', categories: 'Categorías', clients: 'Clientes', newInvoice: 'Nueva factura', invoices: 'Facturas' },
    pages: { dashboard: 'Panel', products: 'Gestión de productos', categories: 'Gestión de categorías', clients: 'Gestión de clientes', newInvoice: 'Nueva factura', invoices: 'Historial de facturas', detail: 'Detalle de factura' },
    actions: { logout: 'Cerrar sesión', recent: 'Facturas recientes', viewAll: 'Ver todo', refresh: 'Actualizar' },
    dashboard: { products: 'Productos', categories: 'Categorías', clients: 'Clientes', invoices: 'Facturas totales', pending: 'Facturas pendientes', revenue: 'Ingresos', createInvoice: 'Crear factura', manageProducts: 'Gestionar productos', manageClients: 'Gestionar clientes', history: 'Ver historial', noInvoices: 'No hay facturas' },
    status: { paid: 'Pagada', pending: 'Pendiente', cancelled: 'Cancelada' },
    common: { save: 'Guardar', cancel: 'Cancelar', edit: 'Editar', delete: 'Eliminar', loading: 'Cargando...', none: 'Ninguno', search: 'Buscar', import: 'Importar', importHint: 'También puedes pegar los datos manualmente. La primera fila CSV debe contener los nombres de las columnas.', create: 'Crear', close: 'Cerrar', name: 'Nombre', email: 'Email', phone: 'Teléfono', address: 'Dirección', description: 'Descripción', notes: 'Notas', price: 'Precio', stock: 'Stock', barcode: 'Código de barras', category: 'Categoría', image: 'Imagen', allStatuses: 'Todos los estados', noResults: 'Sin resultados', notFound: 'Página no encontrada' },
    login: { subtitle: 'Inicia sesión para continuar', signIn: 'Iniciar sesión', signUp: 'Registro', fullName: 'Nombre completo', role: 'Rol', agent: 'Agente (caja)', manager: 'Gerente', password: 'Contraseña', wait: 'Espera...', submitSignIn: 'Iniciar sesión', submitSignUp: 'Crear cuenta', demo: 'Cuenta demo (SQLite)', adapter: 'Adaptador activo' },
    productsView: { title: 'Productos', new: 'Nuevo producto', noProducts: 'No hay productos', edit: 'Editar producto', newTitle: 'Nuevo producto', imageUrl: 'URL o archivo de imagen', noCategory: 'Ninguna', importing: 'Importar productos', inStock: 'en stock' },
    categoriesView: { title: 'Categorías', new: 'Nueva categoría', edit: 'Editar categoría', importing: 'Importar categorías' },
    clientsView: { title: 'Clientes', new: 'Nuevo cliente', edit: 'Editar cliente', importing: 'Importar clientes', discount: 'Descuento general (%)', pricing: 'Precio específico del producto', noClients: 'No hay clientes', noClient: 'Sin cliente' },
    invoicesView: { title: 'Historial de facturas', search: 'Buscar (nº factura, cliente...)', selectAll: 'Seleccionar todas las facturas', invoiceNumber: 'N.º de factura', createdBy: 'Creada por', client: 'Cliente', date: 'Fecha', total: 'Total', status: 'Estado', actions: 'Acciones', noInvoices: 'No hay facturas', view: 'Ver factura', delete: 'Eliminar factura', bulkDelete: 'Eliminar facturas seleccionadas', confirmDelete: '¿Eliminar la factura {number}?', confirmBulk: '¿Eliminar {count} factura(s) seleccionada(s)?' },
    invoiceCreate: { productSearch: 'Buscar por nombre o código de barras', clientSearch: 'Buscar cliente (nombre, email o teléfono)', selectedClient: 'Cliente seleccionado: {name}', customerName: 'Nombre del cliente (opcional)', empty: 'El carrito está vacío', scanHint: 'Escanea un producto o usa la entrada manual', clear: 'Vaciar', payment: 'Pago', received: 'Importe recibido', change: 'Cambio', remaining: 'Pendiente de pago', validate: 'Validar factura', success: '¡Factura validada correctamente!' },
    detail: { back: 'Volver', date: 'Fecha', customer: 'Cliente', createdBy: 'Creada por', status: 'Estado', product: 'Producto', quantity: 'Cant.', unitPrice: 'Precio unit.', total: 'Total', print: 'Imprimir', paid: 'Pagado', delete: 'Eliminar factura' },
    scanner: { activate: 'Pulsa para activar el escáner', start: 'Iniciar escáner', retry: 'Reintentar', stop: 'Detener', manual: 'Entrada manual', code: 'Código de barras o QR', validate: 'Validar', last: 'Último código escaneado' }
  },
  ar: {
    bulkImport: { chooseFile: 'اختيار ملف', formats: 'الصيغ: CSV وJSON وExcel وSQL/Dump وAccess (.mdb/.accdb)', paste: 'ألصق CSV أو JSON هنا', preview: 'معاينة: {count} صف', importing: 'جار الاستيراد...', importRows: 'استيراد {count} صف' },
    language: 'اللغة',
    brand: { name: 'School Store', tagline: 'إدارة مدرسية' },
    theme: { label: 'المظهر', system: 'النظام', light: 'فاتح', dark: 'داكن' },
    layout: { openMenu: 'فتح القائمة', closeMenu: 'إغلاق القائمة' },
    languages: { fr: 'Français', en: 'English', es: 'Español', ar: 'العربية' },
    nav: { dashboard: 'لوحة التحكم', products: 'المنتجات', categories: 'الفئات', clients: 'العملاء', newInvoice: 'فاتورة جديدة', invoices: 'الفواتير' },
    pages: { dashboard: 'لوحة التحكم', products: 'إدارة المنتجات', categories: 'إدارة الفئات', clients: 'إدارة العملاء', newInvoice: 'فاتورة جديدة', invoices: 'سجل الفواتير', detail: 'تفاصيل الفاتورة' },
    actions: { logout: 'تسجيل الخروج', recent: 'الفواتير الأخيرة', viewAll: 'عرض الكل', refresh: 'تحديث' },
    dashboard: { products: 'المنتجات', categories: 'الفئات', clients: 'العملاء', invoices: 'إجمالي الفواتير', pending: 'الفواتير المعلقة', revenue: 'الإيرادات', createInvoice: 'إنشاء فاتورة', manageProducts: 'إدارة المنتجات', manageClients: 'إدارة العملاء', history: 'عرض السجل', noInvoices: 'لا توجد فواتير' },
    status: { paid: 'مدفوعة', pending: 'معلقة', cancelled: 'ملغاة' },
    common: { save: 'حفظ', cancel: 'إلغاء', edit: 'تعديل', delete: 'حذف', loading: 'جار التحميل...', none: 'لا يوجد', search: 'بحث', import: 'استيراد جماعي', importHint: 'يمكنك أيضاً لصق البيانات يدوياً. يجب أن يحتوي الصف الأول من CSV على أسماء الأعمدة.', create: 'إنشاء', close: 'إغلاق', name: 'الاسم', email: 'البريد الإلكتروني', phone: 'الهاتف', address: 'العنوان', description: 'الوصف', notes: 'ملاحظات', price: 'السعر', stock: 'المخزون', barcode: 'الرمز الشريطي', category: 'الفئة', image: 'الصورة', allStatuses: 'كل الحالات', noResults: 'لا توجد نتائج', notFound: 'الصفحة غير موجودة' },
    login: { subtitle: 'سجل الدخول للمتابعة', signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب', fullName: 'الاسم الكامل', role: 'الدور', agent: 'موظف الصندوق', manager: 'مدير', password: 'كلمة المرور', wait: 'انتظر...', submitSignIn: 'تسجيل الدخول', submitSignUp: 'إنشاء الحساب', demo: 'حساب تجريبي (SQLite)', adapter: 'المحول النشط' },
    productsView: { title: 'المنتجات', new: 'منتج جديد', noProducts: 'لا توجد منتجات', edit: 'تعديل المنتج', newTitle: 'منتج جديد', imageUrl: 'رابط الصورة أو الملف', noCategory: 'لا شيء', importing: 'استيراد المنتجات', inStock: 'في المخزون' },
    categoriesView: { title: 'الفئات', new: 'فئة جديدة', edit: 'تعديل الفئة', importing: 'استيراد الفئات' },
    clientsView: { title: 'العملاء', new: 'عميل جديد', edit: 'تعديل العميل', importing: 'استيراد العملاء', discount: 'الخصم العام (%)', pricing: 'سعر منتج خاص', noClients: 'لا يوجد عملاء', noClient: 'بدون عميل' },
    invoicesView: { title: 'سجل الفواتير', search: 'بحث (رقم الفاتورة، العميل...)', selectAll: 'تحديد جميع الفواتير', invoiceNumber: 'رقم الفاتورة', createdBy: 'أنشأها', client: 'العميل', date: 'التاريخ', total: 'الإجمالي', status: 'الحالة', actions: 'الإجراءات', noInvoices: 'لا توجد فواتير', view: 'عرض الفاتورة', delete: 'حذف الفاتورة', bulkDelete: 'حذف الفواتير المحددة', confirmDelete: 'حذف الفاتورة {number}؟', confirmBulk: 'حذف {count} فاتورة محددة؟' },
    invoiceCreate: { productSearch: 'البحث بالاسم أو الرمز الشريطي', clientSearch: 'بحث عن عميل (الاسم أو البريد أو الهاتف)', selectedClient: 'العميل المحدد: {name}', customerName: 'اسم العميل (اختياري)', empty: 'السلة فارغة', scanHint: 'امسح منتجاً أو استخدم الإدخال اليدوي', clear: 'إفراغ', payment: 'الدفع', received: 'المبلغ المستلم', change: 'الباقي', remaining: 'المبلغ المتبقي', validate: 'تأكيد الفاتورة', success: 'تم تأكيد الفاتورة بنجاح!' },
    detail: { back: 'رجوع', date: 'التاريخ', customer: 'العميل', createdBy: 'أنشأها', status: 'الحالة', product: 'المنتج', quantity: 'الكمية', unitPrice: 'سعر الوحدة', total: 'الإجمالي', print: 'طباعة', paid: 'المدفوع', delete: 'حذف الفاتورة' },
    scanner: { activate: 'اضغط لتفعيل الماسح', start: 'بدء الماسح', retry: 'إعادة المحاولة', stop: 'إيقاف', manual: 'إدخال يدوي', code: 'الرمز الشريطي أو QR', validate: 'تأكيد', last: 'آخر رمز ممسوح' }
  }
}

const supportedLocales = Object.keys(messages)
const savedLocale = localStorage.getItem('school-store-locale')
const browserLocale = navigator.language?.slice(0, 2)
const locale = supportedLocales.includes(savedLocale) ? savedLocale : supportedLocales.includes(browserLocale) ? browserLocale : 'fr'

document.documentElement.lang = locale
document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'

export const i18n = createI18n({ legacy: false, locale, fallbackLocale: 'fr', messages })

export function setLocale(nextLocale) {
  if (!supportedLocales.includes(nextLocale)) return
  i18n.global.locale.value = nextLocale
  localStorage.setItem('school-store-locale', nextLocale)
  document.documentElement.lang = nextLocale
  document.documentElement.dir = nextLocale === 'ar' ? 'rtl' : 'ltr'
}

export { supportedLocales }
