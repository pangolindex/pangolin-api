import {BigNumber, BigNumberish} from '@ethersproject/bignumber';
import {TEN, ZERO} from '../constants';

export function adjustValueDecimals(
  value: BigNumber,
  decimalsFrom: BigNumberish,
  decimalsTo: BigNumberish,
): BigNumber {
  const from = BigNumber.from(decimalsFrom);
  const to = BigNumber.from(decimalsTo);

  return to.gt(from) ? value.mul(scalar(to.sub(from))) : value.div(scalar(from.sub(to)));
}

export function scalar(exponent: BigNumberish): BigNumber {
  return TEN.pow(exponent);
}

export function convertStringToBigNumber(
  input: string,
  inputDecimals: number,
  outputDecimals: number,
): BigNumber {
  const LEADING_ZERO_REGEX = /^0+/;
  const adjustedStringValue = Number.parseFloat(input)
    .toFixed(outputDecimals - inputDecimals)
    .replace('.', '')
    .replace(LEADING_ZERO_REGEX, '');
  return adjustedStringValue.length === 0 ? ZERO : BigNumber.from(adjustedStringValue);
}
