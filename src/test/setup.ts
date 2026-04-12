/**
 * Global Vitest setup.
 *
 * In jsdom `navigator.language` is "en-US", which would make our
 * i18n bootstrap pick English and break all tests that assert on
 * the German UI strings. We pin the language to German here so the
 * existing test suite keeps working as components are migrated to
 * i18next. Individual tests that want to exercise EN can call
 * `i18n.changeLanguage("en")` inside the test.
 */

import i18n from "../i18n";

void i18n.changeLanguage("de");
