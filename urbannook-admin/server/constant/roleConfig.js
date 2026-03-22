const ROLES_CONFIG = {
  superadmin: {
    all: ["create", "read", "update", "delete"] 
  },
  admin: {
    products: ["create", "read", "update", "delete"],
    orders: ["read", "update"],
    users: ["read"]
  }
};