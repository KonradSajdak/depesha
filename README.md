[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]


<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/KonradSajdak/depesha">
    <img src="images/logo.jpg" alt="Logo" width="500" height="180">
  </a>

<h3 align="center">depesha.</h3>

  <p align="center">
    Runtime agnostic enterprise messaging system library. 
    <br />
    <a href="https://github.com/KonradSajdak/depesha"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/KonradSajdak/depesha/issues">Report Bug</a>
    ·
    <a href="https://github.com/KonradSajdak/depesha/issues">Request Feature</a>
  </p>
</div>

<!-- ABOUT THE PROJECT -->
## About The Project

The main goal of the project is to create a library implementing __message-based system__ integration patterns in TypeScript, enabling the deferral of decisions regarding the infrastructure layer as far into the future as possible. This includes seamless switching between __synchronous__ and __asynchronous communication__, various message transport options such as __in-memory__ and __message brokers__, as well as patterns like __inbox/outbox__, __routing__, and __message transformations__. All of this is intended to be achieved independently of the JavaScript runtime environment (edge too).


<!-- GETTING STARTED -->
## Getting Started

Doesn't have something to show yet. Project is in planning, but on the days will be more, and more 🎉 Planning stuff also. 😎


<!-- ROADMAP -->
## Roadmap

This is a list of features that I would like to implement in the future. The list is not exhaustive and may change over time. I want to build a library that is easy to use, but also powerful and flexible.

- [ ] Message construction (Envelope Pattern) and serialization (JSON, Protobuf, Avro, etc.)
  - [ ] Object or Class based (no abstraction)
  - [ ] Commands, Events, Queries
  - [ ] Envelope (Routing)
  - [ ] Return Address
- [ ] Composable construction (Builder Pattern?)
- [ ] Message bus abstraction for synchronous and asynchronous communication
  - [ ] Point-to-Point
  - [ ] Publish/Subscribe
  - [ ] Request/Response
- [ ] Transports
  - [ ] In-memory (with Cluster support)
  - [ ] Message brokers/Streaming platforms
    - [ ] Redis Streams
    - [ ] Iggy.rs
    - [ ] Cloudflare Queues
    - [ ] RabbitMQ
    - [ ] Kafka
  - [ ] HTTP
  - [ ] WebSockets
- [ ] Pluginable/Extensible (?)
- [ ] Message patterns
  - [ ] Inbox/Outbox
  - [ ] Routing
  - [ ] Message transformation (middlewares?)
- [ ] OpenTelemetry
  - [ ] Logging
  - [ ] Metrics (Prometheus)
  - [ ] Tracing
- [ ] Patterns
  - [ ] Saga/Process Manager/Workflow
  - [ ] CQRS (Read Models, Projections, etc.)
  - [ ] Event Sourcing
  - [ ] Event Store (?)
- [ ] Migrations tools (via message transformation and message routing)
  - [ ] From one transport to another
  - [ ] From one serialization to another
  - [ ] From one message version to another 


<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.



<!-- CONTACT -->
## Contact

Konrad Sajdak - [@konradsajdak](https://twitter.com/konradsajdak) - konrad.sajdak@yellowgray.pl

Project Link: [https://github.com/KonradSajdak/depesha](https://github.com/KonradSajdak/depesha)



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/)



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/KonradSajdak/depesha.svg
[contributors-url]: https://github.com/KonradSajdak/depesha/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/KonradSajdak/depesha.svg?
[forks-url]: https://github.com/KonradSajdak/depesha/network/members
[stars-shield]: https://img.shields.io/github/stars/KonradSajdak/depesha.svg?
[stars-url]: https://github.com/KonradSajdak/depesha/stargazers
[issues-shield]: https://img.shields.io/github/issues/KonradSajdak/depesha.svg?
[issues-url]: https://github.com/KonradSajdak/depesha/issues
[license-shield]: https://img.shields.io/github/license/KonradSajdak/depesha.
[license-url]: https://github.com/KonradSajdak/depesha/blob/main/LICENSE.txt