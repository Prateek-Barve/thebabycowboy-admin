param location string = 'centralus'
param staticWebAppName string = 'thebabycowboy-admin'

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

#disable-next-line outputs-should-not-contain-secrets
output staticWebAppDeploymentToken string = staticWebApp.listSecrets().properties.apiKey
output staticWebAppDefaultHostname string = staticWebApp.properties.defaultHostname