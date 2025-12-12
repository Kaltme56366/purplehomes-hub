# Unified GHL API for Vercel

This single serverless function consolidates all GHL API integrations to stay within Vercel's free tier limits.

## Environment Variables (Required in Vercel)

```bash
# GHL API
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_location_id
GHL_ACQUISITION_PIPELINE_ID=zL3H2M1BdEKlVDa2YWao

# OpenAI (for caption generation)
OPENAI_API_KEY=your_openai_key

# Google Sheets (for staff authentication)
GOOGLE_SHEET_ID=your_google_sheet_id
GOOGLE_SHEET_CREDENTIALS={"type":"service_account",...}

# Optional
VITE_MAPBOX_TOKEN=your_mapbox_token (for maps)
```

### Google Sheets Setup for Authentication

1. Create a Google Sheet with a tab named "Users"
2. Add columns: Email | Password | Name | Role
3. Create a Service Account in Google Cloud Console
4. Enable Google Sheets API
5. Share the sheet with the service account email
6. Download the JSON credentials and paste as GOOGLE_SHEET_CREDENTIALS (minified)

## Base URL

```
/api/ghl?resource=X&action=Y&id=Z
```

## Required GHL API Scopes

Make sure your GHL app has these scopes enabled:

| Scope | Permission |
|-------|------------|
| opportunities.readonly | View Opportunities |
| opportunities.write | Edit Opportunities |
| contacts.readonly | View Contacts |
| contacts.write | Edit Contacts |
| locations/tags.readonly | View Tags |
| locations/tags.write | Edit Tags |
| locations.readonly | View Locations |
| medias.readonly | View Medias |
| medias.write | Edit Medias |
| socialplanner/post.readonly | View Social Media Posts |
| socialplanner/post.write | Edit Social Media Posts |
| socialplanner/account.readonly | View Social Media Accounts |
| socialplanner/account.write | Edit Social Media Accounts |
| socialplanner/category.readonly | View Social Media Categories |
| socialplanner/tag.readonly | View Social Media Tags |
| socialplanner/statistics.readonly | View Social Planner Statistics |
| locations/customFields.readonly | View Custom Fields |
| locations/customFields.write | Edit Custom Fields |
| locations/customValues.readonly | View Custom Values |
| locations/customValues.write | Edit Custom Values |
| calendars.readonly | View Calendars |
| calendars.write | Edit Calendars |
| calendars/groups.readonly | View Calendar Groups |
| calendars/groups.write | Edit Calendar Groups |
| calendars/events.readonly | View Calendar Events |
| calendars/events.write | Edit Calendar Events |
| calendars/resources.readonly | View Calendar Resources |
| calendars/resources.write | Edit Calendar Resources |
| forms.readonly | View Forms |
| documents_contracts_template/list.readonly | View Document Templates |
| documents_contracts_template/sendLink.write | Send Document Templates |
| documents_contracts/list.readonly | View Documents/Contracts |
| documents_contracts/sendLink.write | Send Documents/Contracts |

## Available API Endpoints

### Contacts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `?resource=contacts` | List all contacts |
| GET | `?resource=contacts&id=X` | Get single contact |
| POST | `?resource=contacts` | Create contact |
| PUT | `?resource=contacts&id=X` | Update contact |
| DELETE | `?resource=contacts&id=X` | Delete contact |

### Opportunities (Properties)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `?resource=opportunities` | List opportunities |
| GET | `?resource=opportunities&id=X` | Get single opportunity |
| POST | `?resource=opportunities` | Create opportunity |
| PUT | `?resource=opportunities&id=X` | Update opportunity |
| DELETE | `?resource=opportunities&id=X` | Delete opportunity |

### Tags
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `?resource=tags` | List all tags |
| POST | `?resource=tags` | Create tag |
| PUT | `?resource=tags&id=X` | Update tag |
| DELETE | `?resource=tags&id=X` | Delete tag |

### Custom Fields
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `?resource=custom-fields&model=opportunity` | List custom fields |
| POST | `?resource=custom-fields` | Create custom field |
| PUT | `?resource=custom-fields&id=X` | Update custom field |
| DELETE | `?resource=custom-fields&id=X` | Delete custom field |

### Custom Values
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `?resource=custom-values` | List custom values |
| POST | `?resource=custom-values` | Create custom value |
| PUT | `?resource=custom-values&id=X` | Update custom value |
| DELETE | `?resource=custom-values&id=X` | Delete custom value |

### Calendars
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `?resource=calendars` | List calendars |
| GET | `?resource=calendars&id=X` | Get single calendar |
| POST | `?resource=calendars` | Create calendar |
| PUT | `?resource=calendars&id=X` | Update calendar |
| DELETE | `?resource=calendars&id=X` | Delete calendar |
| GET | `?resource=calendars&action=groups` | List calendar groups |
| POST | `?resource=calendars&action=groups` | Create calendar group |
| PUT | `?resource=calendars&action=groups&id=X` | Update calendar group |
| DELETE | `?resource=calendars&action=groups&id=X` | Delete calendar group |
| GET | `?resource=calendars&action=events` | List calendar events |
| POST | `?resource=calendars&action=events` | Create calendar event |
| PUT | `?resource=calendars&action=events&id=X` | Update calendar event |
| DELETE | `?resource=calendars&action=events&id=X` | Delete calendar event |
| GET | `?resource=calendars&action=resources` | List calendar resources |
| POST | `?resource=calendars&action=resources` | Create calendar resource |
| PUT | `?resource=calendars&action=resources&id=X` | Update calendar resource |
| DELETE | `?resource=calendars&action=resources&id=X` | Delete calendar resource |

### Forms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `?resource=forms` | List all forms |
| GET | `?resource=forms&id=X` | Get single form |

### Social Planner
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `?resource=social&action=accounts` | List social accounts |
| DELETE | `?resource=social&action=accounts&id=X` | Delete social account |
| GET | `?resource=social&action=posts` | List social posts |
| POST | `?resource=social&action=posts` | Create social post |
| PUT | `?resource=social&action=posts&id=X` | Update social post |
| DELETE | `?resource=social&action=posts&id=X` | Delete social post |
| GET | `?resource=social&action=categories` | List social categories |
| GET | `?resource=social&action=tags` | List social tags |
| GET | `?resource=social&action=statistics` | Get social statistics |

### Media
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `?resource=media` | List media files |
| GET | `?resource=media&id=X` | Get single media |
| POST | `?resource=media&action=upload` | Upload media file |
| DELETE | `?resource=media&id=X` | Delete media file |

### Documents & Contracts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `?resource=documents&action=templates` | List document templates |
| POST | `?resource=documents&action=templates&id=X` | Send template to contact |
| GET | `?resource=documents&action=contracts` | List sent documents |
| POST | `?resource=documents&action=contracts&id=X` | Send document link |
| GET | `?resource=documents` | List documents (legacy) |
| POST | `?resource=documents&id=X` | Send document (legacy) |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `?resource=messages&type=email` | Send email |
| POST | `?resource=messages&type=sms` | Send SMS |

### Location
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `?resource=location` | Get location info |

### AI Caption Generation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `?resource=ai-caption` | Generate AI caption |

## GHL API Documentation Links

- [Opportunities API](https://marketplace.gohighlevel.com/docs/ghl/opportunities/opportunities)
- [Contacts API](https://marketplace.gohighlevel.com/docs/ghl/contacts/contacts)
- [Tags API](https://marketplace.gohighlevel.com/docs/ghl/locations/tags)
- [Custom Fields API](https://marketplace.gohighlevel.com/docs/ghl/locations/custom-field)
- [Custom Values API](https://marketplace.gohighlevel.com/docs/ghl/locations/custom-value)
- [Calendars API](https://marketplace.gohighlevel.com/docs/ghl/calendars/calendars)
- [Forms API](https://marketplace.gohighlevel.com/docs/ghl/forms/forms)
- [Social Planner Category API](https://marketplace.gohighlevel.com/docs/ghl/social-planner/category)
- [Media API](https://marketplace.gohighlevel.com/docs/ghl/medias/media)
- [Documents API](https://marketplace.gohighlevel.com/docs/ghl/documents/documents)
