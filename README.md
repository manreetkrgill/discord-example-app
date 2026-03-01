---

# 🔐 Encryptobot 

Protecting Discord users in the digital age.

A proactive Discord bot that prevents accidental leaks of sensitive information — before damage is done.

Built for **QWIC Hackathon**, Encryptobot focuses on **online safety for users 13+**, empowering communities to communicate securely without sacrificing ease of use.

---

## 🚀 Elevator Pitch

**Encryptobot** is a Discord bot designed to protect users from accidentally sharing sensitive information online. It detects potential API keys, passwords, credit card numbers, and private tokens *in real time* and warns users before the message is exposed.

When sensitive information *is* shared intentionally, Encryptobot converts it into a **secure, temporary locked message**, accessible only after personal verification and automatically deleted after a set time.

Instead of reacting to data leaks, Encryptobot **prevents them at the source**.

---

## 🌍 Why This Matters

In today’s digital world, sensitive data leaks happen every day — often by accident.

Developers, students, and online communities frequently share:

* API keys in public channels
* Passwords without realizing visibility
* Personal or financial information

These mistakes can lead to:

* 💸 Financial loss
* 🔓 Account compromise
* 🪪 Identity theft

**Encryptobot was built on a simple belief:**

> Digital safety shouldn’t rely solely on user vigilance — technology should actively help protect users.

---

## 🛡️ What Encryptobot Does

### 1️⃣ Real-Time Sensitive Data Detection

Encryptobot continuously monitors messages for patterns associated with sensitive data, including:

* API keys (AWS, GitHub, Stripe, bearer tokens)
* Password disclosures (e.g., “password is…”, “pass:”)
* Credit card numbers
* Email addresses
* Personal identification numbers (PINs)

If a risky message is detected, Encryptobot immediately warns the user:

> *“It looks like you're about to send some sensitive information. Click to protect it!”*

The user can then:

* ❌ **Cancel** — message is deleted instantly
* 🔒 **Send Securely** — information is protected

---

### 2️⃣ Secure & Controlled Sharing

When users choose to send sensitive information intentionally, Encryptobot:

* Hides the content behind a **locked message**
* Requires a **personal verification question** to access it
* Automatically **deletes the message after a set time**

This ensures:

* Only intended recipients can view the data
* Sensitive info never lives permanently in chat history

---

## 🎯 Who It’s For

* Discord communities (13+)
* Students & study servers
* Developers & hackathon teams
* Clubs, organizations, and collaborative spaces
* Anyone who values **privacy, safety, and control**

---

## 🧠 Key Design Principles

* **Proactive, not reactive** security
* **User autonomy** — warn, don’t block
* **Minimal friction** — safety without disruption
* **Privacy-first** mindset

---

 **Prevent leaks before they become breaches.**