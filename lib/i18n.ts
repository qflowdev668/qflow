import { userScreenTranslations } from "@/lib/i18n-user-screens"

import { staffAdminByLang } from "./i18n-staff-admin"

export type Language = "en" | "af" | "zu" | "st" | "xh" | "tn"

export const languageOptions: {
  code: Language
  flag: string
  english: string
  native: string
  short: string
}[] = [
  { code: "en", flag: "🇿🇦", english: "English", native: "English", short: "ENG" },
  { code: "af", flag: "🇿🇦", english: "Afrikaans", native: "Afrikaans", short: "AFR" },
  { code: "zu", flag: "🇿🇦", english: "isiZulu", native: "Zulu", short: "ZUL" },
  { code: "st", flag: "🇿🇦", english: "Sesotho", native: "Sotho", short: "SOT" },
  { code: "xh", flag: "🇿🇦", english: "isiXhosa", native: "Xhosa", short: "XHO" },
  { code: "tn", flag: "🇿🇦", english: "Setswana", native: "Tswana", short: "TSW" },
]

export type TranslationKeys = {
  skip: string
  continue: string
  next: string
  getStarted: string
  save: string
  cancel: string

  welcomeToQflow: string
  welcomeSubtitle: string
  chooseLanguage: string
  findLocationTitle: string
  findLocationDesc: string
  joinRemotelyTitle: string
  joinRemotelyDesc: string
  arriveReadyTitle: string
  arriveReadyDesc: string

  welcomeBack: string
  signInToContinue: string
  emailAddress: string
  password: string
  login: string
  forgotPassword: string
  orContinueWith: string
  continueWithGoogle: string
  continueWithEmailCode: string
  dontHaveAccount: string
  register: string
  continueAsUser: string
  demoPreviewStaffAdmin: string
  demoPreviewStaff: string
  adminAccess: string
  adminSignIn: string
  adminPhoneDesc: string
  cellphoneNumber: string
  adminCodeSent: string
  staffAccess: string
  staffSignIn: string
  staffLoginDesc: string
  staffLoginOtpHint: string
  continueWithPassword: string
  staffCodeSent: string
  userModeHint: string

  navHome: string
  navMap: string
  navMyQueue: string
  navProfile: string

  greetingMorning: string
  greetingAfternoon: string
  greetingEvening: string
  findQueueToJoin: string
  nearby: string
  allLocations: string
  searchLocations: string
  noMatchingLocations: string
  youreNext: string
  anyMomentNow: string
  aboutToBeCalledTip: string
  dismissTip: string
  noLocationsFound: string

  myQueue: string
  youreInQueue: string
  peopleAhead: string
  peopleAheadLabel: string
  personAheadLabel: string
  estWait: string
  leaveQueue: string
  noActiveQueue: string
  noActiveQueueHint: string
  findALocation: string
  position: string
  estimatedWait: string
  liveUpdates: string
  switchToSimpleView: string
  switchToNormalView: string
  yourNumber: string
  waitLabel: string
  minutes: string

  selectLanguage: string
  languageUpdated: string
  preview: string
  saveLanguage: string

  createAccount: string
  creatingAccount: string
  fullName: string
  confirmPassword: string
  passwordsDoNotMatch: string
  passwordMinLength: string
  passwordTooWeak: string
  passwordRuleLength: string
  passwordRuleLower: string
  passwordRuleUpper: string
  passwordRuleNumber: string
  passwordRuleSymbol: string
  roleUser: string
  roleStaff: string
  roleUserDesc: string
  roleStaffDesc: string
  privacyAndData: string
  privacyDataSummary: string
  agreeToThe: string
  privacyPolicy: string
  andTerms: string
  termsOfService: string
  notificationConsentOptional: string
  alreadyHaveAccount: string
  privacyModalTitle: string
  privacyWhatWeCollect: string
  privacyCollectNameEmail: string
  privacyCollectQueueHistory: string
  privacyCollectLocationSelections: string
  privacyWhatWeDontDo: string
  privacyNeverSell: string
  privacyNeverShare: string
  privacyNoIdStorage: string
  privacyYourRights: string
  privacyRequestData: string
  privacyDeleteAccount: string
  privacyCorrectInfo: string
  privacyDataRetention: string
  privacyQueueHistoryRetention: string
  privacyAccountDataRetention: string
  privacyContact: string
  termsModalTitle: string
  termsWhatYouAgree: string
  termsUseForQueues: string
  termsAccurateInfo: string
  termsRespectStaff: string
  termsOurCommitments: string
  termsKeepServiceRunning: string
  termsProtectPrivacy: string
  termsFairAccess: string
  termsContact: string
  close: string
  filterAll: string
  filterAvailable: string
  filterBusy: string
  filterFull: string
  openDirections: string

  forgotPasswordTitle: string
  forgotPasswordDesc: string
  resetOtpSentHint: string
  sendingOtp: string
  sendOtp: string
  backToLogin: string

  enterOtp: string
  otpSentToEmail: string
  enterOtpFromEmail: string
  /** Label for OTP field — Supabase may send 6 or 8 digits */
  sixDigitCode: string
  verifying: string
  verifyCode: string
  sending: string
  resendCode: string
  confirmPasswordToResend: string
  sendNewCode: string
  newCodeSent: string

  resetPassword: string
  newPasswordForEmail: string
  newPasswordForAccount: string
  newPassword: string
  confirmNewPassword: string
  saving: string
  updatePassword: string

  emailCode: string
  emailCodeDesc: string
  sendingCode: string
  sendLoginCode: string

  enterLoginCode: string
  loginCodeSentToEmail: string
  enterLoginCodeFromEmail: string
  signingIn: string
  signingYouIn: string
  signInLinkExpired: string
  signInTakingLonger: string
  backToSignIn: string

  splashTagline: string
  cookieTitle: string
  cookieDesc: string
  cookieAccept: string
  cookieContinue: string

  staffDashboard: string
  staffDashboardOnBreak: string
  noLocationAssigned: string
  endShift: string
  statusLive: string
  statusSyncing: string
  statusOffline: string
  active: string
  onBreak: string
  resume: string
  takeBreak: string
  highTrafficBanner: string
  breakEndsIn: string
  imBackResumeService: string
  extendBreakTenMin: string
  connectionLost: string
  queueUpdatesPaused: string
  lastSync: string
  retryConnection: string
  retrying: string
  callNextPerson: string
  addWalkInCustomer: string
  reconnectToCallCustomers: string
  returnFromBreakToServe: string
  priorityQueue: string
  standardQueue: string
  statWaiting: string
  statAvgWait: string
  statServed: string
  statPriority: string
  walkInBadge: string
  offlineBadge: string
  justJoined: string
  waitingMinutes: string
  serveNow: string
  callBtn: string
  noOneWaiting: string
  askAdminForLocation: string
  priorityRulesInfo: string
  goingOnBreak: string
  howLongAway: string
  minutesUnit: string
  otherLabel: string
  minPlaceholder: string
  messageForQueueOptional: string
  selectMessage: string
  breakMessageStaffShort: string
  breakMessageBackAt: string
  breakMessageWaitSoon: string
  confirmBreak: string
  breakHasEnded: string
  returnToServeQueue: string
  endOfShiftSummary: string
  customersServedLabel: string
  avgServiceTimeLabel: string
  noShowsLabel: string
  customersStillWaiting: string
  notesForNextStaff: string
  handoverNotesPlaceholder: string
  completeHandoverEndShift: string
  cancelStayOnShift: string
  shiftEndedHandoverSaved: string
  manualTicketMode: string
  qflowOfflineManualMode: string
  currentlyServingLabel: string
  previousBtn: string
  printTicketForCustomer: string
  manualLog: string
  currentlyServingStatus: string
  servedAtTime: string
  exportManualLogWhenOnline: string
  printTicket: string
  printBtn: string
  waitingForCustomer: string
  waitingForCustomerToArrive: string
  ticketLabel: string
  timeExpiredCustomerNotArrived: string
  customerArrivedBeginService: string
  markAsNoShow: string
  markAsNoShowQuestion: string
  removedFromQueueHint: string
  confirmNoShow: string
  giveMoreTimeTwoMin: string
  customerMarkedNoShow: string
  priorityVerification: string
  priorityVerificationRequired: string
  verifyBeforeServing: string
  customerLabel: string
  acceptedProof: string
  verifiedProceedToServe: string
  couldNotVerifyMoveStandard: string
  moveToStandardQueue: string
  moveToStandardConfirm: string
  yesMoveThem: string
  customerMovedToStandard: string
  emergencyPriority: string
  serveImmediately: string
  priorityFastTrack: string
  nowServing: string
  emergencyPersonnel: string
  elapsedLabel: string
  emergencyCustomerWarning: string
  emergencyVerifyIdHint: string
  ticketNumberLabel: string
  fastTrackCustomerNotice: string
  verifyBeforeCompleting: string
  walkInCustomer: string
  nameLabel: string
  priorityLabel: string
  walkInCallByName: string
  nextInQueue: string
  noOneElseWaiting: string
  serviceComplete: string
  completeService: string
  couldNotVerify: string
  skipNoShow: string
  showRelevantId: string
  adminPanel: string
  adminBadge: string
  navLocations: string
  navReports: string
  navAuditLog: string
  navSettings: string
  totalLocations: string
  activeQueues: string
  usersToday: string
  staffAccounts: string
  todaysPerformance: string
  noPerformanceDataYet: string
  avgWaitBeforeServed: string
  fastestLocation: string
  slowestLocation: string
  peakHourToday: string
  quietestPeriod: string
  capacityAlerts: string
  queueFull: string
  percentFull: string
  alertFull: string
  alertHigh: string
  noLocationsCapacityHint: string
  highLoadTitle: string
  highLoadQueueAt: string
  considerRedirecting: string
  systemHealth: string
  databaseLabel: string
  connected: string
  unreachable: string
  realtimeSync: string
  syncActive: string
  notConfigured: string
  locationLoad: string
  noLocationsMonitor: string
  loadLabel: string
  lastUpdated: string
  refreshBtn: string
  locationsTitle: string
  addNew: string
  noLocationsEmpty: string
  noLocationsEmptyHint: string
  inQueueCount: string
  capacityField: string
  openStatus: string
  closedStatus: string
  editBtn: string
  deleteLocationBtn: string
  deleteLocationTitle: string
  aboutToDelete: string
  willAlsoRemove: string
  activeQueueEntries: string
  allHistoricalData: string
  allStaffAssignments: string
  cannotBeUndone: string
  typeNameToConfirm: string
  deletePermanently: string
  highImpactTitle: string
  highImpactBody: string
  proceedAnyway: string
  locationDeletedToast: string
  editLocation: string
  addLocation: string
  locationName: string
  locationNamePlaceholder: string
  locationType: string
  selectType: string
  typeClinic: string
  typeBank: string
  typeGovernment: string
  typeOther: string
  addressLabel: string
  addressPlaceholder: string
  capacityPlaceholder: string
  descriptionOptional: string
  descriptionPlaceholder: string
  coordinatesLabel: string
  latitude: string
  longitude: string
  coordinatesHint: string
  saveChanges: string
  saveLocation: string
  systemAuditLog: string
  allActions: string
  filterDelete: string
  filterEdit: string
  filterAdd: string
  filterLogin: string
  allTime: string
  filterToday: string
  filterThisWeek: string
  filterThisMonth: string
  allAdmins: string
  noAdminActivityYet: string
  noEntriesMatchFilters: string
  forCustomersWithoutPhone: string
  walkInQueueInfo: string
  customerNameRequired: string
  fullNamePlaceholder: string
  referenceNumberOptional: string
  referenceNumberPlaceholder: string
  notStoredPermanently: string
  cellNumber: string
  comingSoon: string
  smsUpdatesPlaceholder: string
  smsNotAvailableYet: string
  emergencyPriorityLabel: string
  fastTrackPriorityLabel: string
  noPriorityStandard: string
  emergencySkipQueueInfo: string
  fastTrackMoveAheadInfo: string
  staffNotes: string
  notesPlaceholder: string
  dataNoticeTitle: string
  dataNoticeText: string
  addToQueue: string
  emergencyAddedSuccess: string
  fastTrackAddedSuccess: string
  customerAddedSuccess: string
  walkInCustomerLabel: string
  positionLabel: string
  emergencyLabel: string
  priorityLabelShort: string
  estWaitLabel: string
  joinedLabel: string
  immediateWait: string
  emergencyTicketInstructions: string
  standardTicketInstructions: string
  addAnotherWalkIn: string
  manageStaff: string
  manageStaffSubtitle: string
  addStaffMember: string
  staffName: string
  staffEmail: string
  staffPassword: string
  temporaryPasswordHint: string
  assignLocation: string
  selectLocation: string
  noLocationYet: string
  createStaffAccount: string
  creatingStaff: string
  staffList: string
  noStaffYet: string
  reassignLocation: string
  manageStaffAccess: string
  manageStaffAccessTitle: string
  manageStaffAccessDesc: string
  suspendStaff: string
  deleteStaffPermanently: string
  reactivateStaff: string
  staffSuspended: string
  staffSuspendedToast: string
  staffReactivatedToast: string
  staffDeletedToast: string
  removeStaffRole: string
  removeStaffConfirm: string
  staffCreated: string
  staffUpdated: string
  unassigned: string
  backToAdmin: string
  manageAdmins: string
  manageAdminsSubtitle: string
  addAdmin: string
  adminName: string
  adminCell: string
  adminEmail: string
  createAdminAccount: string
  creatingAdmin: string
  adminList: string
  noAdminsYet: string
  deactivateAdmin: string
  reactivateAdmin: string
  deactivateAdminConfirm: string
  adminCreated: string
  adminUpdated: string
  adminActive: string
  adminInactive: string
  lastLogin: string
  neverLoggedIn: string
  bootstrapAdminBadge: string
  bootstrapCannotRemove: string

  joinQueue: string
  offline: string
  minUnit: string
  noThanks: string
  about: string
  statusLabel: string
  unknown: string
  locationTitle: string
  categoryAll: string
  categoryClinic: string
  categoryBank: string
  categoryGovernment: string
  categoryOther: string
  retry: string
  capacity: string
  capacityLow: string
  capacityModerate: string
  capacityHigh: string
  capacityFullLegend: string
  almostFull: string
  nearlyFull: string
  lowWait: string
  queueIsFull: string
  queueCapacity: string
  inQueueStat: string
  available: string
  waiting: string
  peopleWaiting: string
  spotsTaken: string
  locations: string
  noLocationSelectedHint: string
  browseLocations: string
  waitTimeBreakdown: string
  peopleAheadOfYou: string
  avgServiceTime: string
  countersAssumedOpen: string
  calculatedWait: string
  bestCase: string
  worstCase: string
  queueFillingUpFast: string
  reachedCapacity: string
  notifyWhenSpaceOpens: string
  findNearbyLocations: string
  alreadyInQueueTitle: string
  currentlyWaitingAt: string
  positionNumber: string
  oneQueueAtATime: string
  viewMyCurrentQueue: string
  leaveCurrentJoinHere: string
  notAcceptingQueues: string
  closedForNewEntries: string
  findOpenLocations: string
  noInternetConnection: string
  needInternetToJoin: string
  getDirections: string
  notifyWhenSpotOpens: string
  switchQueuesQuestion: string
  leavingQueueWarning: string
  yesSwitchQueues: string
  keepMySpot: string
  basedOn: string
  avgMinService: string
  counters: string
  joinQueueTitle: string
  noLocationSelected: string
  goBackPickLocation: string
  youWillBePlaced: string
  yourPositionWhenJoin: string
  first: string
  nearFront: string
  shorter: string
  peopleInQueue: string
  peopleAheadShort: string
  priorityStatus: string
  qualifyForPriority: string
  fastTrackPriority: string
  priorityPolice: string
  priorityParamedic: string
  priorityFirefighter: string
  priorityTraffic: string
  priorityMilitary: string
  priorityLearner: string
  priorityPregnant: string
  priorityDisability: string
  priorityElderly: string
  priorityInfant: string
  priorityDistress: string
  emergencyPriorityInfoTitle: string
  emergencyPriorityInfo: string
  fastTrackInfoTitle: string
  fastTrackInfo: string
  getNotifiedWhenTurn: string
  allowNotificationsDesc: string
  allowNotifications: string
  notifiedThreeAway: string
  getSmsInstead: string
  smsNotAvailableDesc: string
  smsPhonePlaceholder: string
  smsOptInPrompt: string
  smsYesTextMe: string
  smsSkip: string
  smsInvalidNumber: string
  smsAlertsDesc: string
  queueMoveNotifications: string
  leaveQueueAnytime: string
  joinAsEmergency: string
  joinAsPriority: string
  confirmAndJoin: string
  accessibility: string
  accessibilitySublabel: string
  editProfile: string
  editProfileDesc: string
  profileSaved: string
  profileNameTooShort: string
  emailLockedHint: string
  changePhoto: string
  removePhoto: string
  avatarTooLarge: string
  avatarInvalidType: string
  avatarUploadFailed: string
  avatarUpdated: string
  notifications: string
  session: string
  activeExpires: string
  helpSupport: string
  helpIntro: string
  helpSectionCommonQuestions: string
  helpFaqJoinQ: string
  helpFaqJoinA: string
  helpFaqMissTurnQ: string
  helpFaqMissTurnA: string
  helpFaqTwoQueuesQ: string
  helpFaqTwoQueuesA: string
  helpFaqTurnQ: string
  helpFaqTurnA: string
  helpFaqPriorityQ: string
  helpFaqPriorityA: string
  /** Discreet path for staff/admin — does not reveal unlock gestures. */
  staffOrAdminContactHint: string
  staffOrAdminContactLink: string
  helpSectionContact: string
  helpContactDesc: string
  askQflowDisclosure: string
  helpSendMessage: string
  helpSectionTechnical: string
  helpCheckSystemStatus: string
  helpClearAppData: string
  helpClearingData: string
  helpClearAppDataHint: string
  helpSectionAccessibility: string
  helpAccessibilitySettings: string
  systemStatusTitle: string
  systemStatusIntro: string
  statusNetwork: string
  helpStatusOnline: string
  helpStatusOffline: string
  statusBackend: string
  statusConfigured: string
  statusNotConfigured: string
  statusAppApi: string
  statusChecking: string
  statusReachable: string
  statusUnreachable: string
  statusLocations: string
  statusLocationsCount: string
  statusLastSynced: string
  backToHelp: string
  myDataPrivacy: string
  downloadMyData: string
  downloadMyDataDesc: string
  deleteQueueHistory: string
  deleteQueueHistoryDesc: string
  deleteMyAccount: string
  deleteMyAccountDesc: string
  queueHistory: string
  noQueueHistory: string
  logout: string
  deleteAllHistoryQuestion: string
  deleteHistory: string
  deleteYourAccount: string
  permanentlyRemove: string
  deleteListProfile: string
  deleteListHistory: string
  deleteListNotifications: string
  typeDeleteToConfirm: string
  typeDeletePlaceholder: string
  deleteAccountError: string
  deleting: string
  permanentlyDeleteAccount: string
  sessionInfo: string
  sessionRefreshed: string
  refreshSession: string
  expires: string
  todayAt: string
  yourProfile: string
  statusCompleted: string
  statusCancelled: string
  statusNoShow: string
  markAllRead: string
  justNow: string
  minutesAgo: string
  hoursAgo: string
  daysAgo: string
  noNotificationsYet: string
  noNotificationsHint: string
  /** Shown when the user declines Web Push while joining / waiting in line. */
  keepTabOpenForTurn: string
  notificationSettings: string
  pushNotifications: string
  enabledOnDevice: string
  blockedInBrowser: string
  smsAlerts: string
  notifyMeWhen: string
  fivePeopleAway: string
  twoPeopleAway: string
  itsMyTurn: string
  queueMovingFaster: string
  servicePaused: string
  smsPreview: string
  smsPreviewWithQueue: string
  smsPreviewTurnSoon: string
  smsPreviewNote: string
  savePreferences: string
  preferencesSaved: string
  textSize: string
  sizeSmall: string
  sizeNormal: string
  sizeLarge: string
  sizeXLarge: string
  previewPositionExample: string
  highContrastMode: string
  highContrastDesc: string
  simplifiedMode: string
  simplifiedModeDesc: string
  buttonSize: string
  sizeExtraLarge: string
  saveAccessibilitySettings: string
  settingsSaved: string
  rateYourExperience: string
  howWasExperience: string
  feedbackHelpsServe: string
  rateOnlyAfterServed: string
  ratingPoor: string
  ratingFair: string
  ratingGood: string
  ratingVeryGood: string
  ratingExcellent: string
  additionalComments: string
  tellUsMore: string
  submitFeedback: string
  thankYou: string
  feedbackHelpsImprove: string
  addToHomeScreen: string
  getNotifiedTurn: string
  install: string
  searchClinicsBanks: string
  shortestQueues: string
  noLocationsAdded: string
  noLocationsMatchSearch: string
  qflowInstalled: string
  qflowUnavailable: string
  serviceExperiencingIssues: string
  whatToDo: string
  visitInPerson: string
  askManualTicket: string
  checkBack30Min: string
  openLabel: string
  closedLabel: string
}

/**
 * Plain, short wording for all ages — everyday words, short sentences.
 */
const en = {
  skip: "Skip",
  continue: "Next",
  next: "Next",
  getStarted: "Start",
  save: "Save",
  cancel: "Cancel",

  welcomeToQflow: "Welcome to QFlow",
  welcomeSubtitle: "Wamkelekile · Welkom · Karibu",
  chooseLanguage: "Please choose your language:",
  findLocationTitle: "Find a place",
  findLocationDesc: "Look for clinics, banks, and offices near you. You can search by name too.",
  joinRemotelyTitle: "Join from home",
  joinRemotelyDesc: "Join the line on your phone. You do not need to stand and wait until it is your turn.",
  arriveReadyTitle: "Come when it is your turn",
  arriveReadyDesc: "We will tell you when to come. This helps you save time.",

  welcomeBack: "Welcome back",
  signInToContinue: "Sign in to continue to QFlow",
  emailAddress: "Email",
  password: "Password",
  login: "Sign in",
  forgotPassword: "Forgot password?",
  orContinueWith: "or use",
  continueWithGoogle: "Sign in with Google",
  continueWithEmailCode: "Sign in with email code",
  dontHaveAccount: "No account yet?",
  register: "Create account",
  continueAsUser: "Sign in as a user (you need an account)",
  demoPreviewStaffAdmin: "Demo only — staff and admin (no account needed)",
  demoPreviewStaff: "Demo only — staff (no account needed)",
  adminAccess: "Admin access",
  adminSignIn: "Admin sign in",
  adminPhoneDesc:
    "Enter the admin cellphone number. We will send a login code to the linked admin email.",
  cellphoneNumber: "Cellphone number",
  adminCodeSent: "We sent a login code to the admin email for this number.",
  staffAccess: "Staff access",
  staffSignIn: "Staff sign in",
  staffLoginDesc:
    "Enter the email and password your admin created for you. We will email a confirmation code next.",
  staffLoginOtpHint: "Next step: confirm with the code sent to your email (Resend).",
  continueWithPassword: "Continue",
  staffCodeSent:
    "Password OK. We sent a confirmation code to {email}. Enter it to finish signing in.",
  userModeHint: "Sign in with email, Google, or an email code. We keep you signed in safely.",

  navHome: "Home",
  navMap: "Map",
  navMyQueue: "My line",
  navProfile: "Profile",

  greetingMorning: "Good morning",
  greetingAfternoon: "Good afternoon",
  greetingEvening: "Good evening",
  findQueueToJoin: "Find a line to join",
  nearby: "Near you",
  allLocations: "All places",
  searchLocations: "Search...",
  noMatchingLocations: "No matching locations",
  youreNext: "You're next!",
  anyMomentNow: "Any moment now",
  aboutToBeCalledTip: "Make your way to the counter now - you'll get an alert the moment it's your turn.",
  dismissTip: "Dismiss",
  noLocationsFound: "No places found",

  myQueue: "My line",
  youreInQueue: "You are in the line",
  peopleAhead: "People in front:",
  peopleAheadLabel: "people in front",
  personAheadLabel: "person in front",
  estWait: "Wait time:",
  leaveQueue: "Leave the line",
  noActiveQueue: "You are not in a line",
  noActiveQueueHint: "Find a place and join a line to start.",
  findALocation: "Find a place",
  position: "Your place",
  estimatedWait: "Wait time",
  liveUpdates: "Updates are on",
  switchToSimpleView: "Show big text",
  switchToNormalView: "Show normal view",
  yourNumber: "YOUR NUMBER",
  waitLabel: "WAIT",
  minutes: "MINUTES",

  selectLanguage: "Choose language",
  languageUpdated: "Language set to",
  preview: "Example",
  saveLanguage: "Save language",

  createAccount: "Create account",
  creatingAccount: "Creating account...",
  fullName: "Full name",
  confirmPassword: "Confirm password",
  passwordsDoNotMatch: "Passwords do not match",
  passwordMinLength:
    "Password must be at least 12 characters, with upper and lower case, a number, and a symbol.",
  passwordTooWeak: "Choose a stronger password that meets every rule below.",
  passwordRuleLength: "At least 12 characters",
  passwordRuleLower: "A lowercase letter",
  passwordRuleUpper: "An uppercase letter",
  passwordRuleNumber: "A number",
  passwordRuleSymbol: "A symbol such as ! @ # $",
  roleUser: "User",
  roleStaff: "Staff",
  roleUserDesc: "Join lines at different places",
  roleStaffDesc: "Help run the line at your work place",
  privacyAndData: "Your privacy and data",
  privacyDataSummary: "QFlow uses your name and email to help you join lines. We keep your data safe. We never sell it.",
  agreeToThe: "I agree to the",
  privacyPolicy: "Privacy Policy",
  andTerms: "and",
  termsOfService: "Terms of Service",
  notificationConsentOptional: "I agree to get app and phone alerts about my line (optional)",
  alreadyHaveAccount: "Already have an account?",
  privacyModalTitle: "How QFlow uses your data",
  privacyWhatWeCollect: "What we collect:",
  privacyCollectNameEmail: "Your name and email",
  privacyCollectQueueHistory: "Your line history",
  privacyCollectLocationSelections: "Places you pick (we do not track your GPS)",
  privacyWhatWeDontDo: "What we do not do:",
  privacyNeverSell: "We never sell your data",
  privacyNeverShare: "We never share it with others",
  privacyNoIdStorage: "We do not keep ID numbers forever",
  privacyYourRights: "Your rights (POPIA):",
  privacyRequestData: "Ask for your data any time",
  privacyDeleteAccount: "Delete your account and all data",
  privacyCorrectInfo: "Fix wrong information",
  privacyDataRetention: "How long we keep data:",
  privacyQueueHistoryRetention: "Line history: 12 months",
  privacyAccountDataRetention: "Account data: until you delete it",
  privacyContact: "Contact:",
  termsModalTitle: "Terms of Service",
  termsWhatYouAgree: "When you use QFlow, you agree to:",
  termsUseForQueues: "Use the app to join and manage real queues fairly",
  termsAccurateInfo: "Give accurate details so staff can help you",
  termsRespectStaff: "Treat staff and other people in line with respect",
  termsOurCommitments: "What QFlow commits to:",
  termsKeepServiceRunning: "Keep the service running as reliably as we can",
  termsProtectPrivacy: "Protect your privacy under POPIA",
  termsFairAccess: "Give fair access to queue spots at each location",
  termsContact: "Questions:",
  close: "Close",
  filterAll: "Show all places",
  filterAvailable: "Show places with space",
  filterBusy: "Show busy places",
  filterFull: "Show full places",
  openDirections: "Open directions",

  forgotPasswordTitle: "Forgot password",
  forgotPasswordDesc: "Enter your email. We will send a one-time code so you can make a new password.",
  resetOtpSentHint: "If that email is on file, we sent a code. Check your inbox.",
  sendingOtp: "Sending code...",
  sendOtp: "Send code",
  backToLogin: "Back to sign in",

  enterOtp: "Enter code",
  otpSentToEmail: "We sent a login code to {email}. Type it below.",
  enterOtpFromEmail: "Type the login code from your email.",
  sixDigitCode: "Login code",
  verifying: "Checking...",
  verifyCode: "Check code",
  sending: "Sending...",
  resendCode: "Send code again",
  confirmPasswordToResend: "Enter your password to send a new code.",
  sendNewCode: "Send new code",
  newCodeSent: "A new code was sent to your email.",

  resetPassword: "New password",
  newPasswordForEmail: "Pick a new password for {email}.",
  newPasswordForAccount: "Pick a new password for your account.",
  newPassword: "New password",
  confirmNewPassword: "Confirm new password",
  saving: "Saving...",
  updatePassword: "Save new password",

  emailCode: "Email code",
  emailCodeDesc: "Enter your email. We will send a one-time code to sign in. No password needed.",
  sendingCode: "Sending code...",
  sendLoginCode: "Send sign-in code",

  enterLoginCode: "Enter sign-in code",
  loginCodeSentToEmail: "We sent a login code to {email}. Type it to sign in.",
  enterLoginCodeFromEmail: "Type the login code from your email.",
  signingIn: "Signing in...",
  signingYouIn: "Signing you in",
  signInLinkExpired: "That sign-in link expired. Please try again.",
  signInTakingLonger: "Taking longer than usual",
  backToSignIn: "Back to sign in",

  splashTagline: "Where Waiting Ends",
  cookieTitle: "QFlow uses essential cookies",
  cookieDesc: "We use cookies to keep you signed in and save your place in line. No ads or tracking cookies.",
  cookieAccept: "OK, got it",
  cookieContinue: "Continue",
  askQflowDisclosure:
    "Questions are processed by Meta Llama on Cloudflare and saved to help us improve QFlow.",
}

const af = {
  skip: "Slaan oor",
  continue: "Volgende",
  next: "Volgende",
  getStarted: "Begin",
  save: "Stoor",
  cancel: "Kanselleer",

  welcomeToQflow: "Welkom by QFlow",
  welcomeSubtitle: "Wamkelekile · Welkom · Karibu",
  chooseLanguage: "Kies asseblief jou taal:",
  findLocationTitle: "Vind 'n plek",
  findLocationDesc: "Soek klinieke, banke en kantore naby jou. Jy kan ook met die naam soek.",
  joinRemotelyTitle: "Sluit van die huis af aan",
  joinRemotelyDesc: "Sluit by die ry aan op jou foon. Jy hoef nie te staan en wag tot dit jou beurt is nie.",
  arriveReadyTitle: "Kom as dit jou beurt is",
  arriveReadyDesc: "Ons sal jou sê wanneer om te kom. Dit spaar jou tyd.",

  welcomeBack: "Welkom terug",
  signInToContinue: "Meld aan om QFlow te gebruik",
  emailAddress: "E-pos",
  password: "Wagwoord",
  login: "Meld aan",
  forgotPassword: "Wagwoord vergeet?",
  orContinueWith: "of gebruik",
  continueWithGoogle: "Meld aan met Google",
  continueWithEmailCode: "Meld aan met e-poskode",
  dontHaveAccount: "Nog geen rekening nie?",
  register: "Maak rekening",
  continueAsUser: "Meld aan as gebruiker (jy het 'n rekening nodig)",
  demoPreviewStaffAdmin: "Net demo — personeel en admin (geen rekening nodig)",
  demoPreviewStaff: "Net demo — personeel (geen rekening nodig)",
  adminAccess: "Admin-toegang",
  adminSignIn: "Admin-aanmelding",
  adminPhoneDesc:
    "Voer die admin-selfoonnommer in. Ons stuur 'n aanmeldingskode na die gekoppelde admin-e-pos.",
  cellphoneNumber: "Selfoonnommer",
  adminCodeSent: "Ons het 'n aanmeldingskode na die admin-e-pos vir hierdie nommer gestuur.",
  staffAccess: "Personeel-toegang",
  staffSignIn: "Personeel-aanmelding",
  staffLoginDesc:
    "Voer die e-pos en wagwoord in wat jou admin vir jou geskep het. Ons e-pos daarna 'n bevestigingskode.",
  staffLoginOtpHint: "Volgende stap: bevestig met die kode wat na jou e-pos gestuur is (Resend).",
  continueWithPassword: "Gaan voort",
  staffCodeSent:
    "Wagwoord korrek. Ons het 'n bevestigingskode na {email} gestuur. Tik dit in om aan te meld.",
  userModeHint: "Meld aan met e-pos, Google of 'n e-poskode. Ons hou jou veilig aangemeld.",

  navHome: "Tuis",
  navMap: "Kaart",
  navMyQueue: "My ry",
  navProfile: "Profiel",

  greetingMorning: "Goeie môre",
  greetingAfternoon: "Goeie middag",
  greetingEvening: "Goeie aand",
  findQueueToJoin: "Vind 'n ry om by aan te sluit",
  nearby: "Naby jou",
  allLocations: "Alle plekke",
  searchLocations: "Soek...",
  noMatchingLocations: "Geen ooreenstemmende plekke",
  youreNext: "Jy is volgende!",
  anyMomentNow: "Enige oomblik",
  aboutToBeCalledTip: "Beweeg nou na die toonbank - jy kry kennisgewing as dit jou beurt is.",
  dismissTip: "Maak toe",
  noLocationsFound: "Geen plekke gevind nie",

  myQueue: "My ry",
  youreInQueue: "Jy is in die ry",
  peopleAhead: "Mense voor jou:",
  peopleAheadLabel: "mense voor jou",
  personAheadLabel: "persoon voor jou",
  estWait: "Wagtyd:",
  leaveQueue: "Verlaat die ry",
  noActiveQueue: "Jy is nie in 'n ry nie",
  noActiveQueueHint: "Vind 'n plek en sluit by 'n ry aan om te begin.",
  findALocation: "Vind 'n plek",
  position: "Jou plek",
  estimatedWait: "Wagtyd",
  liveUpdates: "Opdaterings is aan",
  switchToSimpleView: "Wys groot teks",
  switchToNormalView: "Wys gewone aansig",
  yourNumber: "JOU NOMMER",
  waitLabel: "WAG",
  minutes: "MINUTE",

  selectLanguage: "Kies taal",
  languageUpdated: "Taal is nou",
  preview: "Voorbeeld",
  saveLanguage: "Stoor taal",

  createAccount: "Maak rekening",
  creatingAccount: "Besig om rekening te maak...",
  fullName: "Volle naam",
  confirmPassword: "Bevestig wagwoord",
  passwordsDoNotMatch: "Wagwoorde stem nie ooreen nie",
  passwordMinLength:
    "Wagwoord moet minstens 12 karakters wees, met hoof- en kleinletters, 'n syfer en 'n simbool.",
  passwordTooWeak: "Kies 'n sterker wagwoord wat aan elke reël hieronder voldoen.",
  passwordRuleLength: "Minstens 12 karakters",
  passwordRuleLower: "'n Kleinletter",
  passwordRuleUpper: "'n Hoofletter",
  passwordRuleNumber: "'n Syfer",
  passwordRuleSymbol: "'n Simbool soos ! @ # $",
  roleUser: "Gebruiker",
  roleStaff: "Personeel",
  roleUserDesc: "Sluit by rye by verskillende plekke aan",
  roleStaffDesc: "Help die ry by jou werkplek bestuur",
  privacyAndData: "Jou privaatheid en data",
  privacyDataSummary: "QFlow gebruik jou naam en e-pos om jou te help by rye aansluit. Ons hou jou data veilig. Ons verkoop dit nooit.",
  agreeToThe: "Ek stem in tot die",
  privacyPolicy: "Privaatheidsbeleid",
  andTerms: "en",
  termsOfService: "Diensbepalings",
  notificationConsentOptional: "Ek stem in om app- en foonwaarskuwings oor my ry te kry (opsioneel)",
  alreadyHaveAccount: "Het jy reeds 'n rekening?",
  privacyModalTitle: "Hoe QFlow jou data gebruik",
  privacyWhatWeCollect: "Wat ons insamel:",
  privacyCollectNameEmail: "Jou naam en e-pos",
  privacyCollectQueueHistory: "Jou ry-geskiedenis",
  privacyCollectLocationSelections: "Plekke wat jy kies (ons volg nie jou GPS nie)",
  privacyWhatWeDontDo: "Wat ons nie doen nie:",
  privacyNeverSell: "Ons verkoop jou data nooit",
  privacyNeverShare: "Ons deel dit nooit met ander nie",
  privacyNoIdStorage: "Ons hou nie ID-nommers vir altyd nie",
  privacyYourRights: "Jou regte (POPIA):",
  privacyRequestData: "Vra enige tyd vir jou data",
  privacyDeleteAccount: "Skrap jou rekening en alle data",
  privacyCorrectInfo: "Maak verkeerde inligting reg",
  privacyDataRetention: "Hoe lank ons data hou:",
  privacyQueueHistoryRetention: "Ry-geskiedenis: 12 maande",
  privacyAccountDataRetention: "Rekeningdata: tot jy dit skrap",
  privacyContact: "Kontak:",
  termsModalTitle: "Diensbepalings",
  termsWhatYouAgree: "As jy QFlow gebruik, stem jy in om:",
  termsUseForQueues: "Die app regverdig te gebruik om by rye aan te sluit",
  termsAccurateInfo: "Regte besonderhede te gee sodat personeel jou kan help",
  termsRespectStaff: "Personeel en ander in die ry met respek te behandel",
  termsOurCommitments: "Waartoe QFlow verbind is:",
  termsKeepServiceRunning: "Die diens so betroubaar moontlik te hou",
  termsProtectPrivacy: "Jou privaatheid onder POPIA te beskerm",
  termsFairAccess: "Billike toegang tot ryplekke by elke plek te gee",
  termsContact: "Vrae:",
  close: "Sluit",
  filterAll: "Wys alle plekke",
  filterAvailable: "Wys plekke met spasie",
  filterBusy: "Wys besige plekke",
  filterFull: "Wys vol plekke",
  openDirections: "Maak aanwysings oop",

  forgotPasswordTitle: "Wagwoord vergeet",
  forgotPasswordDesc: "Tik jou e-pos in. Ons stuur 'n eenmalige kode sodat jy 'n nuwe wagwoord kan maak.",
  resetOtpSentHint: "As daardie e-pos geregistreer is, het ons 'n kode gestuur. Kyk in jou posbus.",
  sendingOtp: "Besig om kode te stuur...",
  sendOtp: "Stuur kode",
  backToLogin: "Terug na aanmelding",

  enterOtp: "Tik kode in",
  otpSentToEmail: "Ons het 'n aanmeldingskode na {email} gestuur. Tik dit hieronder in.",
  enterOtpFromEmail: "Tik die aanmeldingskode uit jou e-pos in.",
  sixDigitCode: "Aanmeldingskode",
  verifying: "Besig om te kontroleer...",
  verifyCode: "Kontroleer kode",
  sending: "Besig om te stuur...",
  resendCode: "Stuur kode weer",
  confirmPasswordToResend: "Tik jou wagwoord in om 'n nuwe kode te stuur.",
  sendNewCode: "Stuur nuwe kode",
  newCodeSent: "Nuwe kode is na jou e-pos gestuur.",

  resetPassword: "Nuwe wagwoord",
  newPasswordForEmail: "Kies 'n nuwe wagwoord vir {email}.",
  newPasswordForAccount: "Kies 'n nuwe wagwoord vir jou rekening.",
  newPassword: "Nuwe wagwoord",
  confirmNewPassword: "Bevestig nuwe wagwoord",
  saving: "Besig om te stoor...",
  updatePassword: "Stoor nuwe wagwoord",

  emailCode: "E-poskode",
  emailCodeDesc: "Tik jou e-pos in. Ons stuur 'n eenmalige kode om aan te meld. Geen wagwoord nodig nie.",
  sendingCode: "Besig om kode te stuur...",
  sendLoginCode: "Stuur aanmeldingskode",

  enterLoginCode: "Tik aanmeldingskode in",
  loginCodeSentToEmail: "Ons het 'n aanmeldingskode na {email} gestuur. Tik dit in om aan te meld.",
  enterLoginCodeFromEmail: "Tik die aanmeldingskode uit jou e-pos in.",
  signingIn: "Besig om aan te meld...",
  signingYouIn: "Ons meld jou aan",
  signInLinkExpired: "Daardie aanmeldskakel het verval. Probeer asseblief weer.",
  signInTakingLonger: "Dit neem langer as gewoonlik",
  backToSignIn: "Terug na aanmeld",

  splashTagline: "Slaan die ry oor. Nie die diens nie.",
  cookieTitle: "QFlow gebruik noodsaaklike koekies",
  cookieDesc: "Ons gebruik koekies om jou aan te hou aangemeld en jou plek in die ry te stoor. Geen advertensie- of dopkoekies nie.",
  cookieAccept: "OK, ek verstaan",
  cookieContinue: "Gaan voort",
  askQflowDisclosure:
    "Vrae word deur Meta Llama op Cloudflare verwerk en gestoor om QFlow te verbeter.",
}

const zu = {
  skip: "Yeqa",
  continue: "Okulandelayo",
  next: "Okulandelayo",
  getStarted: "Qala",
  save: "Gcina",
  cancel: "Yeka",

  welcomeToQflow: "Siyakwamukela ku-QFlow",
  welcomeSubtitle: "Wamkelekile · Welkom · Karibu",
  chooseLanguage: "Sicela ukhethe ulimi lwakho:",
  findLocationTitle: "Thola indawo",
  findLocationDesc: "Bheka imitholampilo, amabhange, namahhovisi eduze kwakho. Ungasesha ngegama.",
  joinRemotelyTitle: "Joyina usekhaya",
  joinRemotelyDesc: "Joyina umgca ngefoni yakho. Awudingi ukuma ulinde kuze kube yithuba lakho.",
  arriveReadyTitle: "Fika uma kuyithuba lakho",
  arriveReadyDesc: "Sizokutshela ukuthi kufanele uze nini. Lokhu kukonga isikhathi sakho.",

  welcomeBack: "Siyakwamukela futhi",
  signInToContinue: "Ngena ukuze usebenzise i-QFlow",
  emailAddress: "I-imeyili",
  password: "Iphasiwedi",
  login: "Ngena",
  forgotPassword: "Ukhohlwe iphasiwedi?",
  orContinueWith: "noma sebenzisa",
  continueWithGoogle: "Ngena nge-Google",
  continueWithEmailCode: "Ngena ngekhodi ye-imeyili",
  dontHaveAccount: "Awunayo i-akhawunti?",
  register: "Yenza i-akhawunti",
  continueAsUser: "Ngena njengomsebenzisi (udinga i-akhawunti)",
  demoPreviewStaffAdmin: "Isibonelo kuphela — abasebenzi kanye ne-admin (awudingi i-akhawunti)",
  demoPreviewStaff: "Isibonelo kuphela — abasebenzi (awudingi i-akhawunti)",
  adminAccess: "Ukufinyelela kwe-admin",
  adminSignIn: "Ngena njenge-admin",
  adminPhoneDesc:
    "Faka inombolo yomakhalekhukhwini ye-admin. Sizothumela ikhodi yokungena ku-imeyili ye-admin exhunyiwe.",
  cellphoneNumber: "Inombolo yomakhalekhukhwini",
  adminCodeSent: "Sithumele ikhodi yokungena ku-imeyili ye-admin yale nombolo.",
  staffAccess: "Ukufinyelela kwabasebenzi",
  staffSignIn: "Ngena njengomsebenzi",
  staffLoginDesc:
    "Faka i-imeyili nephasiwedi i-admin yakho eyakhelwe wena. Sizothumela ikhodi yokuqinisekisa nge-imeyili.",
  staffLoginOtpHint: "Isinyathelo esilandelayo:qinisekisa ngekhodi ethunyelwe ku-imeyili yakho (Resend).",
  continueWithPassword: "Qhubeka",
  staffCodeSent:
    "Iphasiwedi ilungile. Sithumele ikhodi yokuqinisekisa ku-{email}. Yifake ukuze uqede ukungena.",
  userModeHint: "Ngena nge-imeyili, Google, noma ikhodi ye-imeyili. Sikugcina ungene ngokuphephile.",

  navHome: "Ikhaya",
  navMap: "Imephu",
  navMyQueue: "Umgca wami",
  navProfile: "Iphrofayela",

  greetingMorning: "Sawubona ekuseni",
  greetingAfternoon: "Sawubona ntambama",
  greetingEvening: "Sawubona kusihlwa",
  findQueueToJoin: "Thola umgca ongawujoyina",
  nearby: "Eduze kwakho",
  allLocations: "Zonke izindawo",
  searchLocations: "Sesha...",
  noMatchingLocations: "Azikho izindawo ezifanayo",
  youreNext: "Ungulandelayo!",
  anyMomentNow: "Noma yimuphi umzuzu",
  aboutToBeCalledTip: "Hamba uyekota manje - uzothola isaziso ngesikhathi sakho.",
  dismissTip: "Vala",
  noLocationsFound: "Azikho izindawo",

  myQueue: "Umgca wami",
  youreInQueue: "Usemgqeni",
  peopleAhead: "Abantu phambi kwakho:",
  peopleAheadLabel: "abantu phambi kwakho",
  personAheadLabel: "umuntu phambi kwakho",
  estWait: "Isikhathi sokulinda:",
  leaveQueue: "Phuma emgqeni",
  noActiveQueue: "Awukho emgqeni",
  noActiveQueueHint: "Thola indawo bese ujoyina umgca ukuze uqale.",
  findALocation: "Thola indawo",
  position: "Indawo yakho",
  estimatedWait: "Isikhathi sokulinda",
  liveUpdates: "Izibuyekezo zivuliwe",
  switchToSimpleView: "Bonisa umbhalo omkhulu",
  switchToNormalView: "Bonisa umbuko ojwayelekile",
  yourNumber: "INOMBOLO YAKHO",
  waitLabel: "LINDA",
  minutes: "AMAMINITHI",

  selectLanguage: "Khetha ulimi",
  languageUpdated: "Ulimi manje",
  preview: "Isibonelo",
  saveLanguage: "Gcina ulimi",

  createAccount: "Yenza i-akhawunti",
  creatingAccount: "Senza i-akhawunti...",
  fullName: "Igama eliphelele",
  confirmPassword: "Qinisekisa iphasiwedi",
  passwordsDoNotMatch: "Amaphasiwedi awafani",
  passwordMinLength:
    "Iphasiwedi kufanele ibe nezinhlamvu ezingu-12, uhlamvu olukhulu noluncane, inombolo, nophawu.",
  passwordTooWeak: "Khetha iphasiwedi eqinile ehambisana nemithetho yonke ngezansi.",
  passwordRuleLength: "Okungenani izinhlamvu eziyi-12",
  passwordRuleLower: "Uhlamvu oluncane",
  passwordRuleUpper: "Uhlamvu olukhulu",
  passwordRuleNumber: "Inombolo",
  passwordRuleSymbol: "Uphawu njengo ! @ # $",
  roleUser: "Umsebenzisi",
  roleStaff: "Abasebenzi",
  roleUserDesc: "Joyina imigca ezindaweni ezahlukene",
  roleStaffDesc: "Siza ukulawula umgca endaweni yakho yokusebenzela",
  privacyAndData: "Ubumfihlo bakho nedatha",
  privacyDataSummary: "I-QFlow isebenzisa igama lakho ne-imeyili ukukusiza ujoyine imigca. Sigcina idatha yakho iphephile. Asiyithengisi.",
  agreeToThe: "Ngiyavuma",
  privacyPolicy: "Inqubomgomo Yobumfihlo",
  andTerms: "kanye",
  termsOfService: "Imigomo Yesevisi",
  notificationConsentOptional: "Ngiyavuma ukuthola izaziso zohlelo nezefoni ngomgca wami (okukhethwayo)",
  alreadyHaveAccount: "Usunayo i-akhawunti?",
  privacyModalTitle: "I-QFlow isebenzisa kanjani idatha yakho",
  privacyWhatWeCollect: "Okusikuthola:",
  privacyCollectNameEmail: "Igama lakho ne-imeyili",
  privacyCollectQueueHistory: "Umlando womgca wakho",
  privacyCollectLocationSelections: "Izindawo ozikhethayo (asikulandeleli i-GPS)",
  privacyWhatWeDontDo: "Okungenzi:",
  privacyNeverSell: "Asiyithengisi idatha yakho",
  privacyNeverShare: "Asiyabelani nabo abanye",
  privacyNoIdStorage: "Asigcini izinombolo ze-ID unaphakade",
  privacyYourRights: "Amalungelo akho (POPIA):",
  privacyRequestData: "Cela idatha yakho noma nini",
  privacyDeleteAccount: "Susa i-akhawunti yakho nedatha yonke",
  privacyCorrectInfo: "Lungisa ulwazi olungalungile",
  privacyDataRetention: "Isikhathi esigcina idatha:",
  privacyQueueHistoryRetention: "Umlando womgca: izinyanga eziyi-12",
  privacyAccountDataRetention: "Idatha ye-akhawunti: kuze ususe",
  privacyContact: "Xhumana:",
  termsModalTitle: "Imigomo Yesevisi",
  termsWhatYouAgree: "Uma usebenzisa i-QFlow, uyavuma ukuthi:",
  termsUseForQueues: "Usebenzise uhlelo ngokufanele ukujoyina imigqa",
  termsAccurateInfo: "Unikeze imininingwane eqondile ukuze abasebenzi bakusize",
  termsRespectStaff: "Uphathe abasebenzi nabanye emgqeni ngenhlonipho",
  termsOurCommitments: "Okuzibophezela kwe-QFlow:",
  termsKeepServiceRunning: "Sigcine isevisi isebenza kahle ngangokunokwenzeka",
  termsProtectPrivacy: "Sivikele ubumfihlo bakho ngaphansi kwe-POPIA",
  termsFairAccess: "Sinikeze ukufinyelela okufanele ezindaweni zemigqa",
  termsContact: "Imibuzo:",
  close: "Vala",
  filterAll: "Bonisa zonke izindawo",
  filterAvailable: "Bonisa izindawo ezinesikhala",
  filterBusy: "Bonisa izindawo ezimatasa",
  filterFull: "Bonisa izindawo ezigcwele",
  openDirections: "Vula izinkomba",

  forgotPasswordTitle: "Ukhohlwe iphasiwedi",
  forgotPasswordDesc: "Faka i-imeyili yakho. Sizokuthumelela ikhodi eyodwa ukuze wenze iphasiwedi entsha.",
  resetOtpSentHint: "Uma leyo imeyili ibhalisiwe, sithumele ikhodi. Bheka ibhokisi lakho.",
  sendingOtp: "Sithumela ikhodi...",
  sendOtp: "Thumela ikhodi",
  backToLogin: "Buyela ekungeneni",

  enterOtp: "Faka ikhodi",
  otpSentToEmail: "Sithumele ikhodi yokungena ku-{email}. Yifake ngezansi.",
  enterOtpFromEmail: "Faka ikhodi yokungena evela ku-imeyili yakho.",
  sixDigitCode: "Ikhodi yokungena",
  verifying: "Siyihlola...",
  verifyCode: "Hlola ikhodi",
  sending: "Siyithumela...",
  resendCode: "Thumela ikhodi futhi",
  confirmPasswordToResend: "Faka iphasiwedi yakho ukuze uthumele ikhodi entsha.",
  sendNewCode: "Thumela ikhodi entsha",
  newCodeSent: "Ikhodi entsha ithunyelwe ku-imeyili yakho.",

  resetPassword: "Iphasiwedi entsha",
  newPasswordForEmail: "Khetha iphasiwedi entsha ye-{email}.",
  newPasswordForAccount: "Khetha iphasiwedi entsha ye-akhawunti yakho.",
  newPassword: "Iphasiwedi entsha",
  confirmNewPassword: "Qinisekisa iphasiwedi entsha",
  saving: "Siyilondoloza...",
  updatePassword: "Londoloza iphasiwedi entsha",

  emailCode: "Ikhodi ye-imeyili",
  emailCodeDesc: "Faka i-imeyili yakho. Sizokuthumelela ikhodi eyodwa ukuze ungene. Awudingi iphasiwedi.",
  sendingCode: "Siyithumela ikhodi...",
  sendLoginCode: "Thumela ikhodi yokungena",

  enterLoginCode: "Faka ikhodi yokungena",
  loginCodeSentToEmail: "Sithumele ikhodi yokungena ku-{email}. Yifake ukuze ungene.",
  enterLoginCodeFromEmail: "Faka ikhodi yokungena evela ku-imeyili yakho.",
  signingIn: "Siyangena...",
  signingYouIn: "Siyakungenisa",
  signInLinkExpired: "Isixhumanisi sokungena siphelelwe yisikhathi. Zama futhi.",
  signInTakingLonger: "Kuthatha isikhathi eside kunokujwayelekile",
  backToSignIn: "Buyela ekungeneni",

  splashTagline: "Yeqa umgca. Ungaweqi isevisi.",
  cookieTitle: "I-QFlow isebenzisa amakhukhi abalulekile",
  cookieDesc: "Sisebenzisa amakhukhi ukukugcina ungene futhi silondoloze indawo yakho emgqeni. Akukho makhukhi wokukhangisa noma wokulandelela.",
  cookieAccept: "Kulungile, ngiyezwa",
  cookieContinue: "Qhubeka",
  askQflowDisclosure:
    "Imibuzo icutshungulwa ngu-Meta Llama ku-Cloudflare futhi igcinwa ukuze sithuthukise i-QFlow.",
}

const st = {
  skip: "Tlola",
  continue: "E latelang",
  next: "E latelang",
  getStarted: "Qala",
  save: "Boloka",
  cancel: "Emisa",

  welcomeToQflow: "Rea u amohela ho QFlow",
  welcomeSubtitle: "Wamkelekile · Welkom · Karibu",
  chooseLanguage: "Ka kopo khetha puo ea hao:",
  findLocationTitle: "Fumana sebaka",
  findLocationDesc: "Batla likliniki, libanka le liofisi haufi le uena. O ka batla ka lebitso hape.",
  joinRemotelyTitle: "Kenella o le hae",
  joinRemotelyDesc: "Kenella moleng ka mohala oa hao. Ha o hloke ho ema o emetse ho fihlela e le nako ea hao.",
  arriveReadyTitle: "Tla ha e le nako ea hao",
  arriveReadyDesc: "Re tla u joetsa hore o tle neng. Sena se boloka nako ea hao.",

  welcomeBack: "Rea u amohela hape",
  signInToContinue: "Kena ho sebelisa QFlow",
  emailAddress: "Imeile",
  password: "Password",
  login: "Kena",
  forgotPassword: "U lebetse password?",
  orContinueWith: "kapa sebelisa",
  continueWithGoogle: "Kena ka Google",
  continueWithEmailCode: "Kena ka khoutu ea imeile",
  dontHaveAccount: "Ha o na akhaonto?",
  register: "Etsa akhaonto",
  continueAsUser: "Kena e le mosebelisi (o hloka akhaonto)",
  demoPreviewStaffAdmin: "Pontšo feela — basebetsi le admin (ha o hloke akhaonto)",
  demoPreviewStaff: "Pontšo feela — basebetsi (ha o hloke akhaonto)",
  adminAccess: "Phihlelo ea admin",
  adminSignIn: "Kena e le admin",
  adminPhoneDesc:
    "Kenya nomoro ea mohala ea admin. Re tla romella khoutu ea ho kena ho imeile ea admin e hokahaneng.",
  cellphoneNumber: "Nomoro ea mohala",
  adminCodeSent: "Re rometse khoutu ea ho kena ho imeile ea admin ea nomoro ena.",
  staffAccess: "Phihlelo ea basebetsi",
  staffSignIn: "Kena e le mosebetsi",
  staffLoginDesc:
    "Kenya imeile le password eo admin ea hau e u ethetseng. Re tla romella khoutu ea tiisetso ka imeile.",
  staffLoginOtpHint: "Mohato o latelang: tiisa ka khoutu e rometsoeng imeileng ea hau (Resend).",
  continueWithPassword: "Tsoela pele",
  staffCodeSent:
    "Password e nepahetse. Re rometse khoutu ea tiisetso ho {email}. E kenye ho qetela ho kena.",
  userModeHint: "Kena ka imeile, Google, kapa khoutu ea imeile. Re u boloka o kene ka polokeho.",

  navHome: "Lehae",
  navMap: "Mapa",
  navMyQueue: "Molango oa ka",
  navProfile: "Profaele",

  greetingMorning: "Lumela hoseng",
  greetingAfternoon: "Lumela thapama",
  greetingEvening: "Lumela mantsiboea",
  findQueueToJoin: "Fumana molango oo o ka kenang ho oona",
  nearby: "Haufi le uena",
  allLocations: "Libaka tsohle",
  searchLocations: "Batla...",
  noMatchingLocations: "Ga go na mafelo a a tshwanang",
  youreNext: "O latela!",
  anyMomentNow: "Nakong efe kapa efe",
  aboutToBeCalledTip: "Eya kountering hangkalo - o tla amogela kitsiso hang ha e le nako ya gago.",
  dismissTip: "Tswala",
  noLocationsFound: "Ha ho libaka",

  myQueue: "Molango oa ka",
  youreInQueue: "O moleng",
  peopleAhead: "Batho ka pele ho uena:",
  peopleAheadLabel: "batho ka pele ho uena",
  personAheadLabel: "motho ka pele ho uena",
  estWait: "Nako ea ho ema:",
  leaveQueue: "Tloha moleng",
  noActiveQueue: "Ha o eo moleng",
  noActiveQueueHint: "Fumana sebaka ebe o kenella moleng ho qala.",
  findALocation: "Fumana sebaka",
  position: "Sebaka sa hao",
  estimatedWait: "Nako ea ho ema",
  liveUpdates: "Lintlafatso li bulehile",
  switchToSimpleView: "Bontša mongolo o moholo",
  switchToNormalView: "Bontša pono e tloaelehileng",
  yourNumber: "NOMORO EA HAO",
  waitLabel: "EMA",
  minutes: "METSOTSO",

  selectLanguage: "Khetha puo",
  languageUpdated: "Puo e se e le",
  preview: "Mohlala",
  saveLanguage: "Boloka puo",

  createAccount: "Etsa akhaonto",
  creatingAccount: "Re etsa akhaonto...",
  fullName: "Lebitso le feletseng",
  confirmPassword: "Netefatsa password",
  passwordsDoNotMatch: "Li-password ha li ts'oane",
  passwordMinLength:
    "Password e tlameha ho ba le litlhaku tse 12, litlhaku tse kholo le tse nyane, palo, le letšoao.",
  passwordTooWeak: "Khetha password e matla e latelang melao eohle ka tlase.",
  passwordRuleLength: "Bonyane litlhaku tse 12",
  passwordRuleLower: "Tlhaku e nyane",
  passwordRuleUpper: "Tlhaku e kholo",
  passwordRuleNumber: "Palo",
  passwordRuleSymbol: "Letšoao joalo ka ! @ # $",
  roleUser: "Mosebelisi",
  roleStaff: "Basebetsi",
  roleUserDesc: "Kenella meleng mefuteng e fapaneng",
  roleStaffDesc: "Thuso ho laola moleng sebakeng sa hao sa mosebetsi",
  privacyAndData: "Lekunutu la hao le data",
  privacyDataSummary: "QFlow e sebelisa lebitso la hao le imeile ho u thusa ho kenella moleng. Re boloka data ea hao ka polokeho. Ha re e rekise.",
  agreeToThe: "Ke lumela",
  privacyPolicy: "Leano la Lekunutu",
  andTerms: "le",
  termsOfService: "Melao ea Tshebeletso",
  notificationConsentOptional: "Ke lumela ho fumana litsebiso tsa app le fono ka moleng oa ka (ka boikhethelo)",
  alreadyHaveAccount: "O se u na le akhaonto?",
  privacyModalTitle: "QFlow e sebelisa joang data ea hao",
  privacyWhatWeCollect: "Se re bokellang:",
  privacyCollectNameEmail: "Lebitso la hao le imeile",
  privacyCollectQueueHistory: "Histori ea hao ea moleng",
  privacyCollectLocationSelections: "Libaka tseo u li khethang (ha re latele GPS ea hao)",
  privacyWhatWeDontDo: "Se re sa se etse:",
  privacyNeverSell: "Ha re rekise data ea hao",
  privacyNeverShare: "Ha re arolelane le ba bang",
  privacyNoIdStorage: "Ha re boloke linomoro tsa ID ka ho sa feleng",
  privacyYourRights: "Litokelo tsa hao (POPIA):",
  privacyRequestData: "Kopa data ea hao neng kapa neng",
  privacyDeleteAccount: "Hlakola akhaonto ea hao le data kaofela",
  privacyCorrectInfo: "Lokisa lintlha tse fosahetseng",
  privacyDataRetention: "Nako eo re bolokang data:",
  privacyQueueHistoryRetention: "Histori ea moleng: likhoeli tse 12",
  privacyAccountDataRetention: "Data ea akhaonto: ho fihlela u e hlakola",
  privacyContact: "Ikopanye:",
  termsModalTitle: "Melao ea Tshebeletso",
  termsWhatYouAgree: "Ha u sebelisa QFlow, u lumela ho:",
  termsUseForQueues: "Sebelisa app ka toka ho kena meleng",
  termsAccurateInfo: "Fana ka lintlha tse nepahetseng hore basebetsi ba u thuse",
  termsRespectStaff: "Tšoara basebetsi le ba bang moleng ka tlhompho",
  termsOurCommitments: "Seo QFlow e itlamang ka sona:",
  termsKeepServiceRunning: "Boloka tšebeletso e sebetsa hantle kamoo ho ka khonehang",
  termsProtectPrivacy: "Sireletsa lekunutu la hau tlas'a POPIA",
  termsFairAccess: "Fana ka phihlello e nang le toka libakeng tsa meleng",
  termsContact: "Lipotso:",
  close: "Koala",
  filterAll: "Bontša libaka tsohle",
  filterAvailable: "Bontša libaka tse nang le sebaka",
  filterBusy: "Bontša libaka tse phathahaneng",
  filterFull: "Bontša libaka tse tlatsitseng",
  openDirections: "Bula litaelo",

  forgotPasswordTitle: "U lebetse password",
  forgotPasswordDesc: "Kenya imeile ea hao. Re tla u romella khoutu ea nako e le 'ngoe ho etsa password e ncha.",
  resetOtpSentHint: "Haeba imeile eo e ngolisitsoe, re rometse khoutu. Sheba lebokoseng la hao.",
  sendingOtp: "Re romella khoutu...",
  sendOtp: "Romella khoutu",
  backToLogin: "Khutlela ho kena",

  enterOtp: "Kenya khoutu",
  otpSentToEmail: "Re rometse khoutu ea ho kena ho {email}. E kenye ka tlase.",
  enterOtpFromEmail: "Kenya khoutu ea ho kena ho tsoa imeileng ea hao.",
  sixDigitCode: "Khoutu ea ho kena",
  verifying: "Re hlahloba...",
  verifyCode: "Hlahloba khoutu",
  sending: "Re romella...",
  resendCode: "Romella khoutu hape",
  confirmPasswordToResend: "Kenya password ea hau ho romella khoutu e ncha.",
  sendNewCode: "Romella khoutu e ncha",
  newCodeSent: "Khoutu e ncha e rometsoe imeileng ea hao.",

  resetPassword: "Password e ncha",
  newPasswordForEmail: "Khetha password e ncha bakeng sa {email}.",
  newPasswordForAccount: "Khetha password e ncha bakeng sa akhaonto ea hao.",
  newPassword: "Password e ncha",
  confirmNewPassword: "Netefatsa password e ncha",
  saving: "Re boloka...",
  updatePassword: "Boloka password e ncha",

  emailCode: "Khoutu ea imeile",
  emailCodeDesc: "Kenya imeile ea hao. Re tla u romella khoutu ea nako e le 'ngoe ho kena. Ha o hloke password.",
  sendingCode: "Re romella khoutu...",
  sendLoginCode: "Romella khoutu ea ho kena",

  enterLoginCode: "Kenya khoutu ea ho kena",
  loginCodeSentToEmail: "Re rometse khoutu ea ho kena ho {email}. E kenye ho kena.",
  enterLoginCodeFromEmail: "Kenya khoutu ea ho kena ho tsoa imeileng ea hao.",
  signingIn: "Re kena...",
  signingYouIn: "Re o kenya",
  signInLinkExpired: "Sehokelo sa ho kena se felletse ke nako. Ka kopo leka hape.",
  signInTakingLonger: "Ho nka nako e telele ho feta ka mehla",
  backToSignIn: "Kgutlela ho keneng",

  splashTagline: "Tlola moleng. Se tlolo tšebeletso.",
  cookieTitle: "QFlow e sebelisa li-cookie tsa bohlokoa",
  cookieDesc: "Re sebelisa li-cookie ho u boloka o kene le ho boloka sebaka sa hao moleng. Ha ho li-cookie tsa lipapatso kapa tsa ho u latelela.",
  cookieAccept: "OK, ke utloisise",
  cookieContinue: "Tsoela pele",
  askQflowDisclosure:
    "Dipotso di sebetswa ke Meta Llama ho Cloudflare mme di bolokwa ho ntlafatsa QFlow.",
}

const xh = {
  skip: "Tsiba",
  continue: "Okulandelayo",
  next: "Okulandelayo",
  getStarted: "Qalisa",
  save: "Gcina",
  cancel: "Yeka",

  welcomeToQflow: "Wamkelekile kwi-QFlow",
  welcomeSubtitle: "Wamkelekile · Welkom · Karibu",
  chooseLanguage: "Nceda ukhethe ulwimi lwakho:",
  findLocationTitle: "Fumana indawo",
  findLocationDesc: "Jonga iikliniki, iibhanki, neeofisi kufutshane nawe. Ungakhangela ngegama.",
  joinRemotelyTitle: "Joyina usekhaya",
  joinRemotelyDesc: "Joyina umgca ngefowuni yakho. Awudingi ukuma ulinde de kube lixesha lakho.",
  arriveReadyTitle: "Za xa kuyixesha lakho",
  arriveReadyDesc: "Siza kukuxelela ukuba uze nini. Oku kukugcina ixesha.",

  welcomeBack: "Wamkelekile kwakhona",
  signInToContinue: "Ngena ukuze usebenzise i-QFlow",
  emailAddress: "I-imeyile",
  password: "Igama lokugqitha",
  login: "Ngena",
  forgotPassword: "Ulibele igama lokugqitha?",
  orContinueWith: "okanye sebenzisa",
  continueWithGoogle: "Ngena nge-Google",
  continueWithEmailCode: "Ngena ngekhowudi ye-imeyile",
  dontHaveAccount: "Awunayo iakhawunti?",
  register: "Yenza iakhawunti",
  continueAsUser: "Ngena njengomsebenzisi (ufuna iakhawunti)",
  demoPreviewStaffAdmin: "Umboniso kuphela — abasebenzi kunye ne-admin (awufuni iakhawunti)",
  demoPreviewStaff: "Umboniso kuphela — abasebenzi (awufuni iakhawunti)",
  adminAccess: "Ufikelelo lwe-admin",
  adminSignIn: "Ngena njenge-admin",
  adminPhoneDesc:
    "Faka inombolo yefowuni ye-admin. Siza kuthumela ikhowudi yokungena kwi-imeyile ye-admin edibeneyo.",
  cellphoneNumber: "Inombolo yefowuni",
  adminCodeSent: "Sithumele ikhowudi yokungena kwi-imeyile ye-admin yale nombolo.",
  staffAccess: "Ufikelelo lwabasebenzi",
  staffSignIn: "Ngena njengomsebenzi",
  staffLoginDesc:
    "Faka i-imeyile nephasiwedi i-admin yakho eyakhelwe wena. Siza kuthumela ikhowudi yokuqinisekisa nge-imeyile.",
  staffLoginOtpHint: "Inyathelo elilandelayo:qinisekisa ngekhowudi ethunyelwe kwi-imeyile yakho (Resend).",
  continueWithPassword: "Qhubeka",
  staffCodeSent:
    "Iphasiwedi ilungile. Sithumele ikhowudi yokuqinisekisa ku-{email}. Yifake ukuze ugqibe ukungena.",
  userModeHint: "Ngena nge-imeyile, Google, okanye ikhowudi ye-imeyile. Sikugcina ungene ngokukhuselekileyo.",

  navHome: "Ikhaya",
  navMap: "Imephu",
  navMyQueue: "Umgca wam",
  navProfile: "Iprofayile",

  greetingMorning: "Molo kusasa",
  greetingAfternoon: "Molo emini",
  greetingEvening: "Molo ngokuhlwa",
  findQueueToJoin: "Fumana umgca onokuwujoyina",
  nearby: "Kufutshane nawe",
  allLocations: "Zonke iindawo",
  searchLocations: "Khangela...",
  noMatchingLocations: "Akukho ndawo zihambelanayo",
  youreNext: "Ungulandelayo!",
  anyMomentNow: "Nawuphi na umzuzu",
  aboutToBeCalledTip: "Yiya kwikhawuntara ngoku - uya kufumana isaziso xa kuyithuba lakho.",
  dismissTip: "Vala",
  noLocationsFound: "Azikho iindawo",

  myQueue: "Umgca wam",
  youreInQueue: "Usemgceni",
  peopleAhead: "Abantu phambi kwakho:",
  peopleAheadLabel: "abantu phambi kwakho",
  personAheadLabel: "umntu phambi kwakho",
  estWait: "Ixesha lokulinda:",
  leaveQueue: "Phuma emgceni",
  noActiveQueue: "Awukho emgceni",
  noActiveQueueHint: "Fumana indawo uze ujoyine umgca ukuze uqalise.",
  findALocation: "Fumana indawo",
  position: "Indawo yakho",
  estimatedWait: "Ixesha lokulinda",
  liveUpdates: "Uhlaziyo luvuliwe",
  switchToSimpleView: "Bonisa umbhalo omkhulu",
  switchToNormalView: "Bonisa imbono eqhelekileyo",
  yourNumber: "INOMBOLO YAKHO",
  waitLabel: "LINDA",
  minutes: "IMIZUZU",

  selectLanguage: "Khetha ulwimi",
  languageUpdated: "Ulwimi ngoku",
  preview: "Umzekelo",
  saveLanguage: "Gcina ulwimi",

  createAccount: "Yenza iakhawunti",
  creatingAccount: "Senza iakhawunti...",
  fullName: "Igama elipheleleyo",
  confirmPassword: "Qinisekisa igama lokugqitha",
  passwordsDoNotMatch: "Amagama okugqitha awafani",
  passwordMinLength:
    "Igama lokugqitha kufuneka libe noonobumba abali-12, unobumba omkhulu nomncinci, inani, nophawu.",
  passwordTooWeak: "Khetha igama lokugqitha elomeleleyo elihambelana nemigaqo yonke ngezantsi.",
  passwordRuleLength: "Ubuncinane oonobumba abali-12",
  passwordRuleLower: "Unobumba omncinci",
  passwordRuleUpper: "Unobumba omkhulu",
  passwordRuleNumber: "Inani",
  passwordRuleSymbol: "Uphawu njengo ! @ # $",
  roleUser: "Umsebenzisi",
  roleStaff: "Abasebenzi",
  roleUserDesc: "Joyina imigca kwiindawo ezahlukeneyo",
  roleStaffDesc: "Uncede ukulawula umgca indawo yakho yokusebenzela",
  privacyAndData: "Ubumfihlo bakho nedatha",
  privacyDataSummary: "I-QFlow isebenzisa igama lakho ne-imeyile ukukunceda ujoyine imigca. Sigcina idatha yakho iphephile. Asiyithengisi.",
  agreeToThe: "Ndiyavuma",
  privacyPolicy: "Umthetho Wobumfihlo",
  andTerms: "kunye",
  termsOfService: "Imimmiselo Yeenkonzo",
  notificationConsentOptional: "Ndiyavuma ukufumana izaziso zohlelo nezefowuni ngomgca wam (ukhetho)",
  alreadyHaveAccount: "Usunayo iakhawunti?",
  privacyModalTitle: "I-QFlow isebenzisa njani idatha yakho",
  privacyWhatWeCollect: "Okusikutholayo:",
  privacyCollectNameEmail: "Igama lakho ne-imeyile",
  privacyCollectQueueHistory: "Imbali yomgca wakho",
  privacyCollectLocationSelections: "Iindawo ozikhethayo (asikulandeleli i-GPS)",
  privacyWhatWeDontDo: "Okungasenzi:",
  privacyNeverSell: "Asiyithengisi idatha yakho",
  privacyNeverShare: "Asiyabelani nabanye",
  privacyNoIdStorage: "Asigcini iinombolo ze-ID ngonaphakade",
  privacyYourRights: "Amalungelo akho (POPIA):",
  privacyRequestData: "Cela idatha yakho nanini na",
  privacyDeleteAccount: "Cima iakhawunti yakho nedatha yonke",
  privacyCorrectInfo: "Lungisa ulwazi olungachanekanga",
  privacyDataRetention: "Ixesha esigcina idatha:",
  privacyQueueHistoryRetention: "Imbali yomgca: iinyanga eziyi-12",
  privacyAccountDataRetention: "Idatha yeakhawunti: de uyicime",
  privacyContact: "Qhagamshelana:",
  termsModalTitle: "Imimmiselo Yeenkonzo",
  termsWhatYouAgree: "Xa usebenzisa i-QFlow, uyavuma ukuba:",
  termsUseForQueues: "Usebenzise i-app ngokufanelekileyo ukujoyina imigca",
  termsAccurateInfo: "Unikeze iinkcukacha ezichanekileyo ukuze abasebenzi bakuncede",
  termsRespectStaff: "Uphathe abasebenzi nabanye emgceni ngentlonipho",
  termsOurCommitments: "Into i-QFlow ezibophelele kuyo:",
  termsKeepServiceRunning: "Sigcine inkonzo isebenza kakuhle kangangoko kunokwenzeka",
  termsProtectPrivacy: "Sikhusela ubumfihlo bakho phantsi kwe-POPIA",
  termsFairAccess: "Sinikeze ukufikelela okufanelekileyo kwiindawo zemigca",
  termsContact: "Imibuzo:",
  close: "Vala",
  filterAll: "Bonisa zonke iindawo",
  filterAvailable: "Bonisa iindawo ezinesithuba",
  filterBusy: "Bonisa iindawo ezixakekileyo",
  filterFull: "Bonisa iindawo ezigcweleyo",
  openDirections: "Vula izikhombisi-ndlela",

  forgotPasswordTitle: "Ulibele igama lokugqitha",
  forgotPasswordDesc: "Ngenisa i-imeyile yakho. Siza kukuthumelela ikhowudi enye ukuze wenze igama lokugqitha elitsha.",
  resetOtpSentHint: "Ukuba leyo imeyile ibhalisiwe, sithumele ikhowudi. Jonga ibhokisi lakho.",
  sendingOtp: "Siyithumela ikhowudi...",
  sendOtp: "Thumela ikhowudi",
  backToLogin: "Buyela ekungeneni",

  enterOtp: "Ngenisa ikhowudi",
  otpSentToEmail: "Sithumele ikhowudi yokungena ku-{email}. Yifake ngezansi.",
  enterOtpFromEmail: "Ngenisa ikhowudi yokungena evela kwi-imeyile yakho.",
  sixDigitCode: "Ikhowudi yokungena",
  verifying: "Siyijonga...",
  verifyCode: "Jonga ikhowudi",
  sending: "Siyithumela...",
  resendCode: "Thumela ikhowudi kwakhona",
  confirmPasswordToResend: "Ngenisa igama lokugqitha ukuze uthumele ikhowudi entsha.",
  sendNewCode: "Thumela ikhowudi entsha",
  newCodeSent: "Ikhowudi entsha ithunyelwe kwi-imeyile yakho.",

  resetPassword: "Igama lokugqitha elitsha",
  newPasswordForEmail: "Khetha igama lokugqitha elitsha le-{email}.",
  newPasswordForAccount: "Khetha igama lokugqitha elitsha leakhawunti yakho.",
  newPassword: "Igama lokugqitha elitsha",
  confirmNewPassword: "Qinisekisa igama lokugqitha elitsha",
  saving: "Siyigcina...",
  updatePassword: "Gcina igama lokugqitha elitsha",

  emailCode: "Ikhowudi ye-imeyile",
  emailCodeDesc: "Ngenisa i-imeyile yakho. Siza kukuthumelela ikhowudi enye ukuze ungene. Awufuni igama lokugqitha.",
  sendingCode: "Siyithumela ikhowudi...",
  sendLoginCode: "Thumela ikhowudi yokungena",

  enterLoginCode: "Ngenisa ikhowudi yokungena",
  loginCodeSentToEmail: "Sithumele ikhowudi yokungena ku-{email}. Yifake ukuze ungene.",
  enterLoginCodeFromEmail: "Ngenisa ikhowudi yokungena evela kwi-imeyile yakho.",
  signingIn: "Siyangena...",
  signingYouIn: "Siyakungenisa",
  signInLinkExpired: "Ikhonkco yokungena liphelelwe lixesha. Nceda uzame kwakhona.",
  signInTakingLonger: "Kuthatha ixesha elide kunesiqhelo",
  backToSignIn: "Buyela ekungeneni",

  splashTagline: "Tsiba umgca. Ungawutshibi inkonzo.",
  cookieTitle: "I-QFlow isebenzisa ii-cookies ezibalulekileyo",
  cookieDesc: "Sisebenzisa ii-cookies ukukugcina ungene kwaye silondoloze indawo yakho emgceni. Akukho zii-cookies zezipapasho okanye zokulandelela.",
  cookieAccept: "Kulungile, ndiyiva",
  cookieContinue: "Qhubeka",
  askQflowDisclosure:
    "Imibuzo iqwalaselwa ngu-Meta Llama kwi-Cloudflare kwaye igcinwa ukuze siphucule i-QFlow.",
}

const tn = {
  skip: "Tlola",
  continue: "E e latelang",
  next: "E e latelang",
  getStarted: "Simolola",
  save: "Boloka",
  cancel: "Emisa",

  welcomeToQflow: "O amogetswe mo QFlow",
  welcomeSubtitle: "Wamkelekile · Welkom · Karibu",
  chooseLanguage: "Tsweetswee tlhopha puo ya gago:",
  findLocationTitle: "Batla lefelo",
  findLocationDesc: "Batla dikliniki, dibanka le diofisi gaufi le wena. O ka batla ka leina gape.",
  joinRemotelyTitle: "Tsena o le kwa gae",
  joinRemotelyDesc: "Tsena mo moleng ka mogala wa gago. Ga o tlhoke go ema o letele go fitlha e le nako ya gago.",
  arriveReadyTitle: "Tla fa e le nako ya gago",
  arriveReadyDesc: "Re tla go bolelela gore o tle leng. Se se boloka nako ya gago.",

  welcomeBack: "O amogetswe gape",
  signInToContinue: "Tsena go dirisa QFlow",
  emailAddress: "Imeile",
  password: "Password",
  login: "Tsena",
  forgotPassword: "O lebetse password?",
  orContinueWith: "kgotsa dirisa",
  continueWithGoogle: "Tsena ka Google",
  continueWithEmailCode: "Tsena ka khoutu ya imeile",
  dontHaveAccount: "Ga o na akhaonto?",
  register: "Dira akhaonto",
  continueAsUser: "Tsena jaaka modirisi (o tlhoka akhaonto)",
  demoPreviewStaffAdmin: "Pontsho fela — badiri le admin (ga o tlhoke akhaonto)",
  demoPreviewStaff: "Pontsho fela — badiri (ga o tlhoke akhaonto)",
  adminAccess: "Phitlhelelo ya admin",
  adminSignIn: "Tsena jaaka admin",
  adminPhoneDesc:
    "Tsenya nomoro ya mogala ya admin. Re tla romela khoutu ya go tsena go imeile ya admin e golagantsweng.",
  cellphoneNumber: "Nomoro ya mogala",
  adminCodeSent: "Re rometse khoutu ya go tsena go imeile ya admin ya nomoro eno.",
  staffAccess: "Phitlhelelo ya badiri",
  staffSignIn: "Tsena jaaka modiri",
  staffLoginDesc:
    "Tsenya imeile le password e admin ya gago e go diretseng yona. Re tla romela khoutu ya tiisetso ka imeile.",
  staffLoginOtpHint: "Kgato e e latelang: netefatsa ka khoutu e e rometsweng mo imeileng ya gago (Resend).",
  continueWithPassword: "Tswelela",
  staffCodeSent:
    "Password e siame. Re rometse khoutu ya tiisetso go {email}. E tsenye go wetsa go tsena.",
  userModeHint: "Tsena ka imeile, Google, kgotsa khoutu ya imeile. Re go boloka o tsene ka polokego.",

  navHome: "Gae",
  navMap: "Mapa",
  navMyQueue: "Mola wa me",
  navProfile: "Profaele",

  greetingMorning: "Dumela mosong",
  greetingAfternoon: "Dumela motshegare",
  greetingEvening: "Dumela maitseboa",
  findQueueToJoin: "Batla mola o ka tsenang mo go ona",
  nearby: "Gaufi le wena",
  allLocations: "Mafelo otlhe",
  searchLocations: "Batla...",
  noMatchingLocations: "Ga go na mafelo a a tshwanang",
  youreNext: "O latela!",
  anyMomentNow: "Nakong efe kapa efe",
  aboutToBeCalledTip: "Eya kountering hangkalo - o tla amogela kitsiso hang ha e le nako ya gago.",
  dismissTip: "Tswala",
  noLocationsFound: "Ga go na mafelo",

  myQueue: "Mola wa me",
  youreInQueue: "O mo moleng",
  peopleAhead: "Batho fa pele ga gago:",
  peopleAheadLabel: "batho fa pele ga gago",
  personAheadLabel: "motho fa pele ga gago",
  estWait: "Nako ya go ema:",
  leaveQueue: "Tloga mo moleng",
  noActiveQueue: "Ga o yo mo moleng",
  noActiveQueueHint: "Batla lefelo mme o tsene mo moleng go simolola.",
  findALocation: "Batla lefelo",
  position: "Lefelo la gago",
  estimatedWait: "Nako ya go ema",
  liveUpdates: "Diphetogo di butswe",
  switchToSimpleView: "Bontsha mokwalo o mogolo",
  switchToNormalView: "Bontsha pono e e tlwaelegileng",
  yourNumber: "NOMORO YA GAGO",
  waitLabel: "EMA",
  minutes: "METSOTSO",

  selectLanguage: "Tlhopha puo",
  languageUpdated: "Puo jaanong ke",
  preview: "Sekao",
  saveLanguage: "Boloka puo",

  createAccount: "Dira akhaonto",
  creatingAccount: "Re dira akhaonto...",
  fullName: "Leina le le feletseng",
  confirmPassword: "Netefatsa password",
  passwordsDoNotMatch: "Di-password ga di tshwane",
  passwordMinLength:
    "Password e tshwanetse go nna le ditlhaku di le 12, tlhaku e kgolo le e nnye, palo, le letshwao.",
  passwordTooWeak: "Tlhopha password e e nonofileng e e latelang melao yotlhe fa tlase.",
  passwordRuleLength: "Bonyane ditlhaku di le 12",
  passwordRuleLower: "Tlhaku e nnye",
  passwordRuleUpper: "Tlhaku e kgolo",
  passwordRuleNumber: "Palo",
  passwordRuleSymbol: "Letshwao jaaka ! @ # $",
  roleUser: "Modirisi",
  roleStaff: "Badiri",
  roleUserDesc: "Tsena mo mefuteng e e farologaneng",
  roleStaffDesc: "Thuso go laola mola mo lefelong la gago la tiro",
  privacyAndData: "Bosiamisi jwa gago le data",
  privacyDataSummary: "QFlow e dirisa leina la gago le imeile go go thusa go tsena mo moleng. Re boloka data ya gago ka polokego. Ga re e rekise.",
  agreeToThe: "Ke dumela",
  privacyPolicy: "Pholisi ya Bosiamisi",
  andTerms: "le",
  termsOfService: "Melao ya Tirelo",
  notificationConsentOptional: "Ke dumela go amogela ditsebiso tsa app le founo ka mola wa me (go tlhopha)",
  alreadyHaveAccount: "O setse o na le akhaonto?",
  privacyModalTitle: "QFlow e dirisa jang data ya gago",
  privacyWhatWeCollect: "Se re bokellaneng:",
  privacyCollectNameEmail: "Leina la gago le imeile",
  privacyCollectQueueHistory: "Histori ya mola wa gago",
  privacyCollectLocationSelections: "Mafelo o a tlhophelang (ga re go latela ka GPS)",
  privacyWhatWeDontDo: "Se re se sa dire:",
  privacyNeverSell: "Ga re rekise data ya gago",
  privacyNeverShare: "Ga re e abelane le ba bangwe",
  privacyNoIdStorage: "Ga re boloke dinomoro tsa ID go sa feleng",
  privacyYourRights: "Ditshwanelo tsa gago (POPIA):",
  privacyRequestData: "Kopa data ya gago nako nngwe le nngwe",
  privacyDeleteAccount: "Phimola akhaonto ya gago le data yotlhe",
  privacyCorrectInfo: "Baakanya tshedimosetso e e fosagetseng",
  privacyDataRetention: "Nako e re bolokang data:",
  privacyQueueHistoryRetention: "Histori ya mola: dikgwedi di le 12",
  privacyAccountDataRetention: "Data ya akhaonto: go fitlha o e phimola",
  privacyContact: "Ikgolaganye:",
  termsModalTitle: "Melao ya Tirelo",
  termsWhatYouAgree: "Fa o dirisa QFlow, o dumela go:",
  termsUseForQueues: "Dirisa app ka tshiamo go tsena meleng",
  termsAccurateInfo: "Neela dintlha tse nepagetseng gore badiri ba go thuse",
  termsRespectStaff: "Tshwara badiri le ba bangwe mo moleng ka tlotlo",
  termsOurCommitments: "Se QFlow e ikgatholang ka sona:",
  termsKeepServiceRunning: "Boloka tirelo e dira sentle ka mo go kgonegang",
  termsProtectPrivacy: "Sireletsa sephiri sa gago ka fa tlase ga POPIA",
  termsFairAccess: "Neela phitlhelelo e e siameng kwa mafelong a meleng",
  termsContact: "Dipotso:",
  close: "Tswala",
  filterAll: "Bontsha mafelo otlhe",
  filterAvailable: "Bontsha mafelo a a nang le sebaka",
  filterBusy: "Bontsha mafelo a a pharakanyang",
  filterFull: "Bontsha mafelo a a tletseng",
  openDirections: "Bula ditaelo",

  forgotPasswordTitle: "O lebetse password",
  forgotPasswordDesc: "Tsenya imeile ya gago. Re tla go romela khoutu ya nako e le nngwe go dira password e ntšha.",
  resetOtpSentHint: "Fa imeile eo e kwadilwe, re rometse khoutu. Lebelela lebokoso la gago.",
  sendingOtp: "Re romela khoutu...",
  sendOtp: "Romela khoutu",
  backToLogin: "Boela go tsena",

  enterOtp: "Tsenya khoutu",
  otpSentToEmail: "Re rometse khoutu ya go tsena go {email}. E tsenye fa fa tlase.",
  enterOtpFromEmail: "Tsenya khoutu ya go tsena e e tswang mo imeileng ya gago.",
  sixDigitCode: "Khoutu ya go tsena",
  verifying: "Re e tlhola...",
  verifyCode: "Tlhola khoutu",
  sending: "Re e romela...",
  resendCode: "Romela khoutu gape",
  confirmPasswordToResend: "Tsenya password ya gago go romela khoutu e ntšha.",
  sendNewCode: "Romela khoutu e ntšha",
  newCodeSent: "Khoutu e ntšha e rometswe mo imeileng ya gago.",

  resetPassword: "Password e ntšha",
  newPasswordForEmail: "Tlhopha password e ntšha ya {email}.",
  newPasswordForAccount: "Tlhopha password e ntšha ya akhaonto ya gago.",
  newPassword: "Password e ntšha",
  confirmNewPassword: "Netefatsa password e ntšha",
  saving: "Re e boloka...",
  updatePassword: "Boloka password e ntšha",

  emailCode: "Khoutu ya imeile",
  emailCodeDesc: "Tsenya imeile ya gago. Re tla go romela khoutu ya nako e le nngwe go tsena. Ga o tlhoke password.",
  sendingCode: "Re romela khoutu...",
  sendLoginCode: "Romela khoutu ya go tsena",

  enterLoginCode: "Tsenya khoutu ya go tsena",
  loginCodeSentToEmail: "Re rometse khoutu ya go tsena go {email}. E tsenye go tsena.",
  enterLoginCodeFromEmail: "Tsenya khoutu ya go tsena e e tswang mo imeileng ya gago.",
  signingIn: "Re tsena...",
  signingYouIn: "Re go tsaya",
  signInLinkExpired: "Kgolagano ya go tsena e fedile. Tsweetswee leka gape.",
  signInTakingLonger: "Go tsaya nako e e telele go feta ka gale",
  backToSignIn: "Boela go go tsena",

  splashTagline: "Tlola mola. O se tlhole tirelo.",
  cookieTitle: "QFlow e dirisa di-cookie tse di botlhokwa",
  cookieDesc: "Re dirisa di-cookie go go boloka o tsene le go boloka lefelo la gago mo moleng. Ga go na di-cookie tsa dipapatso kgotsa tsa go go latela.",
  cookieAccept: "Go siame, ke a utlwisisa",
  cookieContinue: "Tswelela",
  askQflowDisclosure:
    "Dipotso di dirwa ke Meta Llama mo Cloudflare mme di bolokiwa go tokafatsa QFlow.",
}

export const translations: Record<Language, TranslationKeys> = {
  en: { ...en, ...userScreenTranslations.en } as unknown as TranslationKeys,
  af: { ...af, ...userScreenTranslations.af } as unknown as TranslationKeys,
  zu: { ...zu, ...userScreenTranslations.zu } as unknown as TranslationKeys,
  st: { ...st, ...userScreenTranslations.st } as unknown as TranslationKeys,
  xh: { ...xh, ...userScreenTranslations.xh } as unknown as TranslationKeys,
  tn: { ...tn, ...userScreenTranslations.tn } as unknown as TranslationKeys,
}

/** Compact queue preview strings (language screen / kiosk). */
export const queuePreviewTranslations = {
  en: {
    youreInQueue: en.youreInQueue,
    peopleAhead: en.peopleAhead,
    estWait: en.estWait,
    leaveQueue: en.leaveQueue,
  },
  af: {
    youreInQueue: af.youreInQueue,
    peopleAhead: af.peopleAhead,
    estWait: af.estWait,
    leaveQueue: af.leaveQueue,
  },
  zu: {
    youreInQueue: zu.youreInQueue,
    peopleAhead: zu.peopleAhead,
    estWait: zu.estWait,
    leaveQueue: zu.leaveQueue,
  },
  st: {
    youreInQueue: st.youreInQueue,
    peopleAhead: st.peopleAhead,
    estWait: st.estWait,
    leaveQueue: st.leaveQueue,
  },
  xh: {
    youreInQueue: xh.youreInQueue,
    peopleAhead: xh.peopleAhead,
    estWait: xh.estWait,
    leaveQueue: xh.leaveQueue,
  },
  tn: {
    youreInQueue: tn.youreInQueue,
    peopleAhead: tn.peopleAhead,
    estWait: tn.estWait,
    leaveQueue: tn.leaveQueue,
  },
} as const satisfies Record<
  Language,
  { youreInQueue: string; peopleAhead: string; estWait: string; leaveQueue: string }
>

export function getTranslations(lang: Language): TranslationKeys {
  const base = translations[lang] ?? translations.en
  return { ...base, ...staffAdminByLang[lang] } as TranslationKeys
}
