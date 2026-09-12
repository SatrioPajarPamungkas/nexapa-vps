import { defineMiddlewares, authenticate } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/nexapa*",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
  ],
})
