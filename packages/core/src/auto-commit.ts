import { PendingMessage } from "./stream"

export const autoCommit = <T>(pull: Promise<PendingMessage<T>>): Promise<T> => {
  return pull.then(message => message.commit())
}
