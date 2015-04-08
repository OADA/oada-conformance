exports.authorization = {
  uri: 'https://www.valleyix.com/Oada/Web',
  automation: [
       {
        fields: {
            '#txtGrowerUserName': 'TestGrower',
            '#txtGrowerPassword': 'Valmont#1',
            '#txtGrowerUrl': 'https://test.basestation3.com'
        },
        successClick: '#btnSubmit'
      },
      {
        clicks: [ 'input[type=checkbox]' ],
        successClick: '#btnAllow',
        failureClick: '#btnDeny'
      }
  ],
  registrationDocument: {
      "software_version": "1.0-ga",
      "scopes": "read:planting.prescriptions write:fields",
      "software_statement": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Im5jNjNkaGFTZGQ4MnczMnVkeDZ2In0.eyJyZWRpcmVjdF91cmlzIjpbImh0dHBzOi8vY2xpZW50LmV4YW1wbGUuY29tL2NhbGxiYWNrIiwiaHR0cHM6Ly9jbGllbnQuZXhhbXBsZS5jb20vY2IiXSwidG9rZW5fZW5kcG9pbnRfYXV0aF9tZXRob2QiOiJ1cm46aWV0ZjpwYXJhbXM6b2F1dGg6Y2xpZW50LWFzc2VydGlvbi10eXBlOmp3dC1iZWFyZXIiLCJncmFudF90eXBlcyI6WyJpbXBsaWNpdCIsImF1dGhvcml6YXRpb25fY29kZSIsInJlZnJlc2hfdG9rZW4iXSwicmVzcG9uc2VfdHlwZXMiOlsidG9rZW4iLCJjb2RlIl0sImNsaWVudF9uYW1lIjoiRXhhbXBsZSBPQURBIENsaWVudCIsImNsaWVudF91cmkiOiJodHRwOi8vZXhhbXBsZS5jb20iLCJsb2dvX3VyaSI6Imh0dHA6Ly9leGFtcGxlLmNvbS9sb2dvLnBuZyIsImNvbnRhY3RzIjpbIkNsaW50IENsaWVudCA8Y2NsaWVudEBleGFtcGxlLmNvbT4iXSwidG9zX3VyaSI6Imh0dHA6Ly9leGFtcGxlLmNvbS90b3MuaHRtbCIsInBvbGljeV91cmkiOiJodHRwOi8vZXhhbXBsZS5jb20vcG9saWN5Lmh0bWwiLCJqd2tzX3VyaSI6Imh0dHBzOi8vZXhhbXBsZS5jb20vandrcyIsInNvZnR3YXJlX2lkIjoiZGp4a2phdTNuOTM3eHo3amFrbDMiLCJyZWdpc3RyYXRpb25fcHJvdmlkZXIiOiJyZWdpc3RyYXRpb24uZXhhbXBsZS5jb20ifQ.Te_NzrMTfrMaIldbIPRm5E0MnI1SjBf1G_19MslsJVdDSIUj_9YMloa4iTt_ztuJD4G0IP77AfU2x-XHqTjB8LybDlL8nyDERQhO8KNV3jbPKpKNsndZx5LDGX1XKJNH53IE4GB9Le8CE3TZNdVPxxuJcNi4RGYk0RJtdv6h1bo"
    }
};

exports.options = {
    userAgentValue : 'OADA-Compliance-Test/1.1 (mocha; node-js)'
};