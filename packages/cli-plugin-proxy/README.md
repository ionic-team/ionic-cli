# @ionic/cli-plugin-proxy

This CLI plugin provides a way to proxy CLI network requests through your
firewall. Proxy settings are configured through environment variables. The
plugin responds to the same environment variables as npm (`HTTP_PROXY`,
`HTTPS_PROXY`), with an additional, Ionic-specific one (`IONIC_HTTP_PROXY`).

To quickly test the plugin, install it globally and run:

```bash
$ HTTPS_PROXY=https://internal.proxy.com ionic start
```
