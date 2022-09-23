export const DIGIT = /[0-9]/

export const ALPHA = /[A-z]/

export const VSCHAR = /[\u0020-\u007E]/

export const NQCHAR = /[\u0021|\u0023-\u005B|\u005D-\u007E]/

export const NQSCHAR = /[\u0020-\u0021|\u0023-\u005B|\u005D-\u007E]/

export const UNICODECHARNOCRLF =
  // eslint-disable-next-line no-control-regex
  /[\u0009|\u0020-\u007E|\u0080-\uD7FF|\uE000-\uFFFD|\u10000-\u10FFFF]/

export const CLIENT_ID_REGEXP = RegExp(`^${VSCHAR.source}+$`)

export const CLIENT_SECRET_REGEXP = RegExp(`^${VSCHAR.source}+$`)

export const RESPONSE_TYPE_REGEXP = RegExp(
  `^(_|${DIGIT.source}|${ALPHA.source})+$`,
)

export const SCOPE_REGEXP = RegExp(`^${NQCHAR.source}+$`)

export const STATE_REGEXP = RegExp(`^${VSCHAR.source}+$`)

// URI with second level domain /^(?<href>(?<protocol>[a-zA-Z0-9]+:)\/\/(?<host>(?<hostname>[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,4})(:(?<port>([0-6][0-5][0-5][0-3][0-5])|([0-5]?[0-9]{0,4})))?)(?<path>(?<pathname>\/[-a-zA-Z0-9@:%_+./]*)(\?(?<search>[-a-zA-Z0-9@:%_+.~#?&//=]*))?)?)$/
export const URI_REGEXP =
  /^(?<href>(?<protocol>[a-zA-Z0-9]+:)\/\/(?<host>(?<hostname>[-a-zA-Z0-9@:%._+~#=]{2,256}(\.[a-z]{2,4})?)(:(?<port>([0-6][0-5][0-5][0-3][0-5])|([0-5]?[0-9]{0,4})))?)(?<path>(?<pathname>\/[-a-zA-Z0-9@:%_+./]*)(\?(?<search>[-a-zA-Z0-9@:%_+.~#?&//=]*))?)?)$/

export const ERROR_REGEXP = RegExp(`^${NQSCHAR.source}+$`)

export const ERROR_DESCRIPTION_REGEXP = RegExp(`^${NQSCHAR.source}+$`)

export const ERROR_URI_REGEXP = RegExp(URI_REGEXP.source)

export const GRANT_TYPE_REGEXP = RegExp(
  `(^(-|.|_|${DIGIT.source}|${ALPHA.source})+$)|(${URI_REGEXP.source})`,
)

export const CODE_REGEXP = RegExp(`^${VSCHAR.source}+$`)

export const ACCESS_TOKEN_REGEXP = RegExp(`^${VSCHAR.source}+$`)

export const TOKEN_TYPE_REGEXP = RegExp(
  `(^(-|.|_|${DIGIT.source}|${ALPHA.source})+$)|(${URI_REGEXP.source})`,
)

export const EXPIRES_IN_REGEXP = RegExp(`^${DIGIT.source}+$`)

export const USERNAME_REGEXP = RegExp(`^${UNICODECHARNOCRLF.source}+$`)

export const PASSWORD_REGEXP = RegExp(`^${UNICODECHARNOCRLF.source}+$`)

export const REFRESH_TOKEN_REGEXP = RegExp(`^${VSCHAR.source}+$`)

export const ENDPOINT_PARAMETERS_REGEXP = RegExp(
  `^(-|.|_|${DIGIT.source}|${ALPHA.source})+$`,
)
