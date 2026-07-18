# Calcs

Calcs is a small iOS app for turning formulas you reuse into live, saved worksheets. Every displayed value is editable: change a calculated value and Calcs solves backward for its source, then updates the rest.

## Features

- Bidirectional values: edit a base or calculated value and the others update
- Multiple base values and calculated values per calculator
- Number, AUD currency, or percentage display formatting for every value
- Collapsible calculator cards
- Manual creation or validated JSON import using instructions copied to any AI model
- Results can reference inputs and earlier results
- Safe formula parser: no arbitrary JavaScript evaluation
- Local, offline persistence for calculators and values
- Number, Australian-dollar, and percentage formatting
- Native Expo UI actions and iOS haptics
- Included yearly-salary starter calculator

## Formula syntax

Names become lowercase formula keys with underscores. For example, `Annual salary` becomes `annual_salary`.

Supported operators: `+`, `-`, `*`, `/`, `%`, `^`, and parentheses. Supported functions: `round`, `min`, `max`, `abs`, `ceil`, `floor`, `sqrt`, and `pow`.

Example:

```text
annual_salary / (38 * 52)
```

## Agent import

Tap add, choose **With Agent**, and describe the calculator. Calcs copies a prompt containing the request, supported formula syntax, and its versioned JSON contract. Paste the AI model's JSON response back into Calcs; it is validated before a calculator is created.

Run the importer and creation tests with:

```bash
npm test
```

## Run locally

```bash
npm install
npm run ios
```

For a native development client:

```bash
npx expo run:ios
```

## EAS builds

```bash
eas build --platform ios --profile development
eas build --platform ios --profile development-simulator
```

The first profile creates a signed internal build for a registered iPhone. The second creates an iOS Simulator build.
