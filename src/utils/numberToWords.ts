// Correct way to export
export function numberToWords(num: number): string {
  if (isNaN(num)) return '';
  if (num === 0) return 'Zero';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Lakh', 'Crore'];

  function getWords(n: number): string {
    let str = '';
    if (n > 99) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n = n % 100;
    }
    if (n > 19) {
      str += tens[Math.floor(n / 10)] + ' ';
      n = n % 10;
    } else if (n >= 10) {
      str += teens[n - 10] + ' ';
      n = 0;
    }
    if (n > 0) {
      str += units[n] + ' ';
    }
    return str;
  }

  let integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  let words = '';
  const scaleIdx = 0;

  // Indian system: split into groups (last 3, then 2, 2, ...)
  const parts = [];
  parts.push(integerPart % 1000); // last 3 digits
  integerPart = Math.floor(integerPart / 1000);
  while (integerPart > 0) {
    parts.push(integerPart % 100);
    integerPart = Math.floor(integerPart / 100);
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] !== 0) {
      words += getWords(parts[i]) + (scales[i] ? scales[i] + ' ' : '');
    }
  }

  words = words.trim();
  if (decimalPart > 0) {
    words += ` and ${getWords(decimalPart)}Paise`;
  }
  return words.trim();
}
