export const hasValues = (data, keys) => {
    return keys.every(key => !!data[key])
}
