import { Pending } from "./stream"

export const autoCommit = <T>(pull: Promise<Pending<T>>) => {
  return pull.then(message => {
    message.commit()
    return message
  })
}
