import { expect, test } from "@playwright/test";
test("korumalı ekran kullanıcıyı girişe yönlendirir",async({page})=>{await page.goto("/");await expect(page).toHaveURL(/\/login$/);await expect(page.getByRole("heading",{name:"Envantra’ya giriş"})).toBeVisible();await expect(page.getByLabel("Kullanıcı adı")).toBeVisible();await expect(page.getByLabel("Parola")).toBeVisible()});
