export const hasValues = (data, keys) => {
    return keys.every(key => !!data[key])
}

export const docToData = doc => {
    const data = { ...(doc.toObject?.() || doc) }
    data.id = data._id
    delete data._id
    delete data.__v
    return data
}
