# 🧩 .brief.demo: `use case` via `example` = `booking flight`

## 💡 Concept

A use case describes how a user interacts with a system to achieve a specific goal, detailing actors, steps, and system responses to define functional requirements in software development.

## ❓ Question

> What is an example of a use case?

## 📌 Example: Booking a Flight on a Travel Website

### 📌.📖 What

> What is the use case "booking a flight on a travel website"?

The use case "booking a flight on a travel website" is a structured description of how a traveler uses an online platform like Expedia or Kayak to purchase an airline ticket.

- **Actor**: Traveler (the user seeking to book a flight).
- **Goal**: To purchase an airline ticket for a chosen destination and date.
- **Preconditions**: The user has access to the travel website via a web browser or mobile app and a valid payment method.
- **Main Flow**:
  1. **User**: Navigates to the website’s homepage and enters departure city, destination, travel dates, and passenger details, then clicks “Search.”
  2. **System**: Displays a list of available flights with details (airlines, times, prices).
  3. **User**: Selects a preferred flight and optional extras (e.g., seat selection, baggage).
  4. **System**: Prompts for passenger details (name, contact info) and payment information.
  5. **User**: Enters payment details and confirms the booking.
  6. **System**: Processes payment, books the ticket, and sends a confirmation email with the ticket.
- **Exceptions**:
  - **No Flights Available**: If no flights match the criteria, the system displays an error and suggests alternative dates or destinations.
  - **Payment Failure**: If payment fails, the system notifies the user and prompts re-entry or an alternative payment method.

### 📌.🔍 How

> How is it an example of a use case?

The use case "booking a flight on a travel website" exemplifies a use case by providing a structured description of a traveler’s interaction with a system to achieve a specific goal, capturing user actions, system responses, and edge cases. It serves as a clear blueprint for developers, illustrating how use cases define functional requirements and ensure user-centric system design.

- **Defined Actor and Goal**
  - **Traveler as Actor**: Specifies the user (traveler) as the primary actor, aligning with the use case’s focus on who interacts with the system.
  - **Clear Objective**: The goal of purchasing a ticket drives the interaction, a core element of any use case.
  - **System Role**: The travel website facilitates the goal, acting as the system under consideration.
- **Structured Interaction Flow**
  - **Sequential Steps**: Details a clear sequence (search, select, pay), mirroring the step-by-step flow typical of use case descriptions.
  - **User-System Dialogue**: Alternates between user actions (e.g., entering details) and system responses (e.g., displaying flights), reflecting use case dynamics.
  - **Preconditions Included**: Specifies requirements like internet access and payment method, setting the stage for the interaction.
- **Exception Handling**
  - **Error Scenarios**: Addresses cases like no flights or payment failure, showing how use cases account for alternate paths.
  - **User Guidance**: System responses (e.g., error messages, prompts) ensure users can navigate issues, a key use case feature.
  - **Robustness**: Captures edge cases, ensuring the system is designed to handle real-world challenges.
- **Requirements Specification**
  - **Functional Needs**: Outlines needs like search functionality and payment processing, guiding developers on system features.
  - **Security Focus**: Highlights secure payment handling, a critical requirement derived from the use case.
  - **Stakeholder Clarity**: Provides a clear reference for developers, testers, and designers to align on user needs and system behavior.
