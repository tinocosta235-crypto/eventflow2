# Salesforce Integration Contract v1 (Mock)

Date: 2026-03-15  
Scope: EventFlow MVP Week 3

## Endpoint
- `GET /api/events/:id/crm/salesforce`
- `POST /api/events/:id/crm/salesforce`

## Object Modes
- `CONTACTS`
- `LEADS`

## Field Mapping
- `firstName` -> `FirstName`
- `lastName` -> `LastName`
- `email` -> `Email`
- `company` -> `Company`
- `jobTitle` -> `Title`
- `registrationCode` -> `EventFlow_Registration_Code__c`
- `eventId` -> `EventFlow_Event_Id__c`
- `eventTitle` -> `EventFlow_Event_Title__c`
- `registrationStatus` -> `EventFlow_Registration_Status__c`
- `createdAt` -> `EventFlow_Registration_Created_At__c`

## POST Request Body
```json
{
  "mode": "CONTACTS",
  "dryRun": true
}
```

## POST Response (example)
```json
{
  "success": true,
  "provider": "salesforce",
  "contractVersion": "v1-mock",
  "mode": "CONTACTS",
  "dryRun": true,
  "synced": 124,
  "payloadPreview": [
    {
      "FirstName": "Mario",
      "LastName": "Rossi",
      "Email": "mario@azienda.it",
      "Company": "Pirelli",
      "Title": "Marketing Lead",
      "EventFlow_Registration_Code__c": "REG-AB1234",
      "EventFlow_Event_Id__c": "evt_123",
      "EventFlow_Event_Title__c": "Evento Pirelli",
      "EventFlow_Registration_Status__c": "CONFIRMED",
      "EventFlow_Registration_Created_At__c": "2026-03-15T11:00:00.000Z"
    }
  ],
  "message": "Dry-run completata. Nessun record inviato a Salesforce."
}
```

## Notes
- MVP behavior is mock-first (no outbound Salesforce API call in Week 3).
- Every sync execution writes an internal log marker in `EmailSendLog` (`[SF_SYNC_MOCK] ...`) for traceability.
