// https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageConstructionIntro.html

export type Message<T = unknown> = {
  headers: Record<string, unknown>
  body: T
}
