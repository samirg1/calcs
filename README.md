# Calcs

Calcs is a small iOS app for turning formulas you reuse into live, saved worksheets. Add one or more inputs, describe the results with formulas, and every output updates as you type.

## Features

- Multiple inputs and calculated results per calculator
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
