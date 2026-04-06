// Globale Type-Definitionen für eStundnzettl

// Build-Time Variablen
declare const __APP_VERSION__: string;

// Vite/import.meta.env
interface ImportMeta {
  env: {
    DEV?: boolean;
    PROD?: boolean;
    MODE?: string;
  };
}

// Capacitor Plugins
declare module '@capacitor-community/sqlite' {
  export const CapacitorSQLite: any;
}

declare module '@capacitor/app' {
  export const App: any;
}

declare module '@capacitor/filesystem' {
  export const Filesystem: any;
  export const Directory: any;
  export const Encoding: any;
}

declare module '@capacitor/share' {
  export const Share: any;
}

declare module '@capacitor/toast' {
  export const Toast: any;
}

declare module '@capacitor/haptics' {
  export const Haptics: any;
  export const ImpactStyle: any;
  export const NotificationType: any;
}

declare module '@capacitor/preferences' {
  export const Preferences: any;
}

declare module '@capacitor-community/http' {
  export const Http: any;
}

declare module '@capacitor-community/sqlite/electron' {
  export const CapacitorSQLite: any;
}

// GoogleDriveBackupPlugin
declare module 'GoogleDriveBackup' {
  export interface GoogleDriveBackupPlugin {
    getStatus(options: { scope: string }): Promise<{
      connected: boolean;
      hasToken: boolean;
      reauthRequired: boolean;
      scope: string;
      accountEmail?: string;
      source?: string;
      [key: string]: any;
    }>;
    connect(options: { scope: string }): Promise<{
      accessToken: string;
      accountEmail?: string;
      source?: string;
      [key: string]: any;
    }>;
    refreshToken(options: { scope: string }): Promise<{
      accessToken: string;
      accountEmail?: string;
      source?: string;
      [key: string]: any;
    }>;
    disconnect(): Promise<void>;
  }
  const GoogleDriveBackup: GoogleDriveBackupPlugin;
  export { GoogleDriveBackup };
}

// React Hot Toast
declare module 'react-hot-toast' {
  export const toast: any;
  export const Toaster: any;
  export default toast;
}

// Bild-Dateien
declare module '*.png' {
  const value: string;
  export default value;
}
declare module '*.jpg' {
  const value: string;
  export default value;
}
declare module '*.jpeg' {
  const value: string;
  export default value;
}
declare module '*.svg' {
  const value: string;
  export default value;
}

// MultiSharePlugin
declare module '../plugins/MultiSharePlugin' {
  export const MultiShare: any;
}

// NextcloudLoginFlowPlugin
declare module '../plugins/NextcloudLoginFlowPlugin' {
  export interface NextcloudLoginFlowPlugin {
    startLoginFlow(options: { serverUrl: string }): Promise<{ url: string; token: string; loginName: string; }>;
  }
  const NextcloudLoginFlow: NextcloudLoginFlowPlugin;
  export { NextcloudLoginFlow };
}

// PDF-Lib
declare module 'pdf-lib' {
  export const PDFDocument: any;
  export const StandardFonts: any;
  export const rgb: any;
}

// Date-fns
declare module 'date-fns' {
  export const format: any;
  export const parseISO: any;
  export const startOfWeek: any;
  export const endOfWeek: any;
  export const startOfMonth: any;
  export const endOfMonth: any;
  export const eachDayOfInterval: any;
  export const isSameDay: any;
  export const isSameMonth: any;
  export const addDays: any;
  export const addMonths: any;
  export const subMonths: any;
  export const differenceInMinutes: any;
  export const differenceInHours: any;
  export const formatDistanceToNow: any;
  export const formatDuration: any;
  export const intervalToDuration: any;
}

// React Icons
declare module 'react-icons/fa' {
  export const FaPlus: any;
  export const FaTrash: any;
  export const FaEdit: any;
  export const FaSave: any;
  export const FaTimes: any;
  export const FaCalendarAlt: any;
  export const FaClock: any;
  export const FaFilePdf: any;
  export const FaCloudUploadAlt: any;
  export const FaGoogleDrive: any;
  export const FaNextcloud: any;
  export const FaCog: any;
  export const FaUser: any;
  export const FaBuilding: any;
  export const FaBriefcase: any;
  export const FaHistory: any;
  export const FaChartBar: any;
  export const FaFileExport: any;
  export const FaFileImport: any;
  export const FaSync: any;
  export const FaCheck: any;
  export const FaExclamationTriangle: any;
  export const FaInfoCircle: any;
  export const FaQuestionCircle: any;
  export const FaArrowLeft: any;
  export const FaArrowRight: any;
  export const FaChevronDown: any;
  export const FaChevronUp: any;
  export const FaBars: any;
  export const FaHome: any;
  export const FaList: any;
  export const FaChartPie: any;
  export const FaCogs: any;
  export const FaSignOutAlt: any;
  export const FaSignInAlt: any;
  export const FaUserPlus: any;
  export const FaDatabase: any;
  export const FaMobileAlt: any;
  export const FaDesktop: any;
  export const FaServer: any;
  export const FaNetworkWired: any;
  export const FaShieldAlt: any;
  export const FaLock: any;
  export const FaUnlock: any;
  export const FaKey: any;
  export const FaQrcode: any;
  export const FaWifi: any;
  export const FaBluetooth: any;
  export const FaSatellite: any;
  export const FaMapMarkerAlt: any;
  export const FaCompass: any;
  export const FaGlobe: any;
  export const FaMap: any;
  export const FaRoute: any;
  export const FaWalking: any;
  export const FaCar: any;
  export const FaBicycle: any;
  export const FaTrain: any;
  export const FaBus: any;
  export const FaShip: any;
  export const FaPlane: any;
  export const FaRocket: any;
  export const FaSpaceShuttle: any;
  export const FaSatelliteDish: any;
  export const FaMicrochip: any;
  export const FaRobot: any;
  export const FaAndroid: any;
  export const FaApple: any;
  export const FaWindows: any;
  export const FaLinux: any;
  export const FaChrome: any;
  export const FaFirefox: any;
  export const FaSafari: any;
  export const FaEdge: any;
  export const FaOpera: any;
  export const FaInternetExplorer: any;
  export const FaBrave: any;
  export const FaVivaldi: any;
  export const FaTor: any;
  export const FaVpn: any;
  export const FaProxy: any;
  export const FaCloudflare: any;
  export const FaAws: any;
  export const FaAzure: any;
  export const FaDigitalOcean: any;
  export const FaGoogleCloud: any;
  export const FaIbm: any;
  export const FaOracle: any;
  export const FaSalesforce: any;
  export const FaSap: any;
  export const FaShopify: any;
  export const FaWordpress: any;
  export const FaJoomla: any;
  export const FaDrupal: any;
  export const FaMagento: any;
  export const FaWoo: any;
  export const FaSquarespace: any;
  export const FaWix: any;
  export const FaWebflow: any;
  export const FaBootstrap: any;
  export const FaCss3Alt: any;
  export const FaHtml5: any;
  export const FaJsSquare: any;
  export const FaNodeJs: any;
  export const FaReact: any;
  export const FaVuejs: any;
  export const FaAngular: any;
  export const FaSvelte: any;
  export const FaEmber: any;
  export const FaBackbone: any;
  export const FaMeteor: any;
  export const FaNextJs: any;
  export const FaNuxt: any;
  export const FaGatsby: any;
  export const FaGridsome: any;
  export const FaEleventy: any;
  export const FaHugo: any;
  export const FaJekyll: any;
  export const FaHexo: any;
  export const FaGhost: any;
  export const FaStrapi: any;
  export const FaDirectus: any;
  export const FaSanity: any;
  export const FaContentful: any;
  export const FaPrismic: any;
  export const FaStoryblok: any;
  export const FaButter: any;
  export const FaGraphcms: any;
  export const FaDato: any;
  export const FaKontent: any;
  export const FaAgility: any;
  export const FaUmbraco: any;
  export const FaSitecore: any;
  export const FaAem: any;
  export const FaDrupalAlt: any;
  export const FaJoomlaAlt: any;
  export const FaWordpressSimple: any;
  export const FaMagentoAlt: any;
  export const FaShopifyAlt: any;
  export const FaSquarespaceAlt: any;
  export const FaWixAlt: any;
  export const FaWebflowAlt: any;
  export const FaBootstrapAlt: any;
  export const FaCss3: any;
  export const FaHtml: any;
  export const FaJs: any;
  export const FaNode: any;
  export const FaReacteurope: any;
  export const FaVue: any;
  export const FaAngularjs: any;
  export const FaSveltejs: any;
  export const FaEmberjs: any;
  export const FaBackbonejs: any;
  export const FaMeteorjs: any;
  export const FaNext: any;
  export const FaNuxtjs: any;
  export const FaGatsbyjs: any;
  export const FaGridsomejs: any;
  export const Fa11: any;
  export const FaHugojs: any;
  export const FaJekylljs: any;
  export const FaHexojs: any;
  export const FaGhostjs: any;
  export const FaStrapijs: any;
  export const FaDirectusjs: any;
  export const FaSanityjs: any;
  export const FaContentfuljs: any;
  export const FaPrismicjs: any;
  export const FaStoryblokjs: any;
  export const FaButterjs: any;
  export const FaGraphcmsjs: any;
  export const FaDatojs: any;
  export const FaKontentjs: any;
  export const FaAgilityjs: any;
  export const FaUmbracojs: any;
  export const FaSitecorejs: any;
  export const FaAemjs: any;
}

declare module 'react-icons/md' {
  export const MdAdd: any;
  export const MdDelete: any;
  export const MdEdit: any;
  export const MdSave: any;
  export const MdClose: any;
  export const MdCalendarToday: any;
  export const MdAccessTime: any;
  export const MdPictureAsPdf: any;
  export const MdCloudUpload: any;
  export const MdDrive: any;
  export const MdStorage: any;
  export const MdSettings: any;
  export const MdPerson: any;
  export const MdBusiness: any;
  export const MdWork: any;
  export const MdHistory: any;
  export const MdBarChart: any;
  export const MdImportExport: any;
  export const MdSync: any;
  export const MdCheck: any;
  export const MdWarning: any;
  export const MdInfo: any;
  export const MdHelp: any;
  export const MdArrowBack: any;
  export const MdArrowForward: any;
  export const MdExpandMore: any;
  export const MdExpandLess: any;
  export const MdMenu: any;
  export const MdHome: any;
  export const MdList: any;
  export const MdPieChart: any;
  export const MdBuild: any;
  export const MdExitToApp: any;
  export const MdLogin: any;
  export const MdPersonAdd: any;
  export const MdDatabase: any;
  export const MdPhoneAndroid: any;
  export const MdDesktopMac: any;
  export const MdServer: any;
  export const MdNetworkCheck: any;
  export const MdSecurity: any;
  export const MdLock: any;
  export const MdLockOpen: any;
  export const MdVpnKey: any;
  export const MdQrCode: any;
  export const MdWifi: any;
  export const MdBluetooth: any;
  export const MdSatellite: any;
  export const MdPlace: any;
  export const MdExplore: any;
  export const MdPublic: any;
  export const MdMap: any;
  export const MdDirections: any;
  export const MdDirectionsWalk: any;
  export const MdDirectionsCar: any;
  export const MdDirectionsBike: any;
  export const MdDirectionsTransit: any;
  export const MdDirectionsBoat: any;
  export const MdFlight: any;
  export const MdRocket: any;
  export const MdRocketLaunch: any;
  export const MdSatelliteAlt: any;
  export const MdMemory: any;
  export const MdSmartToy: any;
  export const MdAndroid: any;
  export const MdApple: any;
  export const MdWindows: any;
  export const MdLinux: any;
  export const MdChrome: any;
  export const MdFirefox: any;
  export const MdSafari: any;
  export const MdEdge: any;
  export const MdOpera: any;
  export const MdIe: any;
  export const MdBrave: any;
  export const MdVivaldi: any;
  export const MdTor: any;
  export const MdVpnLock: any;
  export const MdProxy: any;
  export const MdCloud: any;
  export const MdAws: any;
  export const MdAzure: any;
  export const MdDigitalOcean: any;
  export const MdGoogleCloud: any;
  export const MdIbm: any;
  export const MdOracle: any;
  export const MdSalesforce: any;
  export const MdSap: any;
  export const MdShopify: any;
  export const MdWordpress: any;
  export const MdJoomla: any;
  export const MdDrupal: any;
  export const MdMagento: any;
  export const MdWoo: any;
  export const MdSquarespace: any;
  export const MdWix: any;
  export const MdWebflow: any;
  export const MdBootstrap: any;
  export const MdCss: any;
  export const MdHtml: any;
  export const MdJavascript: any;
  export const MdNodejs: any;
  export const MdReact: any;
  export const MdVuejs: any;
  export const MdAngular: any;
  export const MdSvelte: any;
  export const MdEmber: any;
  export const MdBackbone: any;
  export const MdMeteor: any;
  export const MdNext: any;
  export const MdNuxt: any;
  export const MdGatsby: any;
  export const MdGridsome: any;
  export const Md11: any;
  export const MdHugo: any;
  export const MdJekyll: any;
  export const MdHexo: any;
  export const MdGhost: any;
  export const MdStrapi: any;
  export const MdDirectus: any;
  export const MdSanity: any;
  export const MdContentful: any;
  export const MdPrismic: any;
  export const MdStoryblok: any;
  export const MdButter: any;
  export const MdGraphcms: any;
  export const MdDato: any;
  export const MdKontent: any;
  export const MdAgility: any;
  export const MdUmbraco: any;
  export const MdSitecore: any;
  export const MdAem: any;
  export const MdDrupalAlt: any;
  export const MdJoomlaAlt: any;
  export const MdWordpressSimple: any;
  export const MdMagentoAlt: any;
  export const MdShopifyAlt: any;
  export const MdSquarespaceAlt: any;
  export const MdWixAlt: any;
  export const MdWebflowAlt: any;
  export const MdBootstrapAlt: any;
  export const MdCss3: any;
  export const MdHtml5: any;
  export const MdJs: any;
  export const MdNode: any;
  export const MdReacteurope: any;
  export const MdVue: any;
  export const MdAngularjs: any;
  export const MdSveltejs: any;
  export const MdEmberjs: any;
  export const MdBackbonejs: any;
  export const MdMeteorjs: any;
  export const MdNextjs: any;
  export const MdNuxtjs: any;
  export const MdGatsbyjs: any;
  export const MdGridsomejs: any;
  export const Md11js: any;
  export const MdHugojs: any;
  export const MdJekylljs: any;
  export const MdHexojs: any;
  export const MdGhostjs: any;
  export const MdStrapijs: any;
  export const MdDirectusjs: any;
  export const MdSanityjs: any;
  export const MdContentfuljs: any;
  export const MdPrismicjs: any;
  export const MdStoryblokjs: any;
  export const MdButterjs: any;
  export const MdGraphcmsjs: any;
  export const MdDatojs: any;
  export const MdKontentjs: any;
  export const MdAgilityjs: any;
  export const MdUmbracojs: any;
  export const MdSitecorejs: any;
  export const MdAemjs: any;
}
