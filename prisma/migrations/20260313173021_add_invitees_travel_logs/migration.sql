-- CreateTable
CREATE TABLE "Invitee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "jobTitle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "declineReason" TEXT,
    "dietary" TEXT,
    "accessibility" TEXT,
    "companions" INTEGER NOT NULL DEFAULT 0,
    "invitesSent" INTEGER NOT NULL DEFAULT 0,
    "lastInviteSentAt" DATETIME,
    "emailOpenedAt" DATETIME,
    "emailClickedAt" DATETIME,
    "inviteToken" TEXT NOT NULL,
    "convertedToRegistration" BOOLEAN NOT NULL DEFAULT false,
    "registrationId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invitee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TravelPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviteeId" TEXT NOT NULL,
    "transportType" TEXT,
    "transportNumber" TEXT,
    "departureLocation" TEXT,
    "arrivalLocation" TEXT,
    "departureTime" DATETIME,
    "arrivalTime" DATETIME,
    "returnTransportType" TEXT,
    "returnTransportNumber" TEXT,
    "returnDepartureLocation" TEXT,
    "returnArrivalLocation" TEXT,
    "returnDepartureTime" DATETIME,
    "returnArrivalTime" DATETIME,
    "hotelName" TEXT,
    "hotelAddress" TEXT,
    "checkIn" DATETIME,
    "checkOut" DATETIME,
    "roomNumber" TEXT,
    "bookingRef" TEXT,
    "transferType" TEXT,
    "transferNotes" TEXT,
    "reimbursementAmount" REAL,
    "reimbursementStatus" TEXT,
    "reimbursementNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TravelPlan_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "Invitee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InviteeCustomField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviteeId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'text',
    "value" TEXT,
    CONSTRAINT "InviteeCustomField_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "Invitee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InviteLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviteeId" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSubject" TEXT,
    "method" TEXT NOT NULL DEFAULT 'email',
    "notes" TEXT,
    CONSTRAINT "InviteLog_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "Invitee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitee_inviteToken_key" ON "Invitee"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "Invitee_eventId_email_key" ON "Invitee"("eventId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "TravelPlan_inviteeId_key" ON "TravelPlan"("inviteeId");
