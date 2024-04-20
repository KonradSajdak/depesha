import { PendingMessage } from "./stream"

export const autoCommit = <T>(pull: Promise<PendingMessage<T>>) => {
  return pull.then(message => {
    message.commit()
    return message
  })
}
