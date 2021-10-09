/**
 * @type {import('xo').Options}
 */
module.exports = {
  prettier: true,
  space: true,
  rules: {
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    'array-callback-return': 'warn',
    'no-await-in-loop': 'warn',
    'unicorn/no-abusive-eslint-disable': 'warn',
    '@typescript-eslint/naming-convention': 'warn'
  },
}
