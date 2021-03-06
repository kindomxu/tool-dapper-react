import { readSettings} from '../atoms/CookieReader'
const IPFSReader = require(`./IPFSReader`)


export const fetchABI = async cookies => {
  let settings = readSettings(cookies)

  switch (settings.currentSource) {
    default: {
      return IPFSReader.downloadFiles(settings.ipfs)
        .then(files => {
          return { abi: files }
        })
        .catch(err => {
          throw err
        })
    }
  }
}

export default fetchABI
