function replaceBigInt(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value; // Let JSON.stringify handle dates
  if (Array.isArray(value)) return value.map(replaceBigInt);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = replaceBigInt(v);
    }
    return out;
  }
  return value;
}

module.exports = { replaceBigInt };
