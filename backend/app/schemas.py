from pydantic import BaseModel, ConfigDict, Field


class UserOut(BaseModel):
    id: str
    name: str
    role: str
    role_label: str = Field(serialization_alias="roleLabel")
    does: str
    status: str


class LoginIn(BaseModel):
    email: str
    password: str


class ResidentOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    room: str
    age: int
    jot: str
    day_note: str = Field(serialization_alias="dayNote")
    handover: str
    watch: str | None = None
    tags: list[str] = []
    points: list[str] = []
    sent: bool
    approved: bool
    at: str = ""


class FlagOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    resident_id: str = Field(serialization_alias="residentId")
    resident_name: str = Field(serialization_alias="residentName")
    room: str
    kind: str
    title: str
    why: str
    source_quote: str = Field(default="", serialization_alias="sourceQuote")
    note_id: str = Field(default="", serialization_alias="noteId")
    status: str
    at: str = ""


class NoteOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    resident_id: str = Field(serialization_alias="residentId")
    resident_name: str = Field(serialization_alias="residentName")
    room: str
    jot: str
    day_note: str = Field(serialization_alias="dayNote")
    points: list[str] = []
    sent: bool
    approved: bool
    when_label: str = Field(serialization_alias="when")
    at: str = ""


class IncidentOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    resident_id: str = Field(serialization_alias="residentId")
    resident_name: str = Field(serialization_alias="residentName")
    room: str
    reported_by: str = Field(serialization_alias="reportedBy")
    kind: str
    summary: str
    status: str
    when_label: str = Field(serialization_alias="when")
    at: str = ""


class ActionOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    resident_id: str = Field(serialization_alias="residentId")
    resident_name: str = Field(serialization_alias="residentName")
    room: str
    title: str
    detail: str
    assignee: str
    status: str
    source: str = "manual"
    flag_id: str = Field(default="", serialization_alias="flagId")
    incident_id: str = Field(default="", serialization_alias="incidentId")
    handover: str = ""
    at: str = ""


class AuditOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    actor_name: str = Field(serialization_alias="actor")
    action: str
    subject: str
    at_label: str = Field(serialization_alias="at")


class SettingOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    label: str
    value: str
    hint: str
    group_name: str = Field(serialization_alias="group")


class ShiftOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    draft: str
    published_text: str = Field(serialization_alias="publishedText")
    published: bool


class DeskOut(BaseModel):
    residents: list[ResidentOut]
    notes: list[NoteOut]
    users: list[UserOut]
    flags: list[FlagOut]
    incidents: list[IncidentOut]
    actions: list[ActionOut]
    audit: list[AuditOut]
    settings: list[SettingOut]
    shift: ShiftOut


class WatchItem(BaseModel):
    id: str
    name: str
    room: str
    watch: str


class SettledItem(BaseModel):
    id: str
    name: str
    room: str


class WorkerDashboard(BaseModel):
    user: UserOut
    residents: list[ResidentOut]


class SeniorDashboard(BaseModel):
    user: UserOut
    residents: list[ResidentOut]


class ManagerDashboard(BaseModel):
    user: UserOut
    watching: list[WatchItem]
    settled: list[SettledItem]


class AdminDashboard(BaseModel):
    user: UserOut
    users: list[UserOut]


class ResidentIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    room: str = Field(default="", max_length=20)
    age: int = Field(ge=0, le=130)
    tags: str = Field(default="", max_length=200)


class TagsIn(BaseModel):
    tags: str = Field(default="", max_length=200)


class DraftIn(BaseModel):
    jot: str = Field(min_length=1, max_length=2000)


class PointsIn(BaseModel):
    points: list[str] = Field(min_length=1, max_length=12)


class SendIn(BaseModel):
    sent: bool = True


class ApproveIn(BaseModel):
    approved: bool


class HandoverIn(BaseModel):
    handover: str = Field(min_length=1, max_length=4000)


class IncidentIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    resident_id: str = Field(alias="residentId", min_length=1)
    kind: str = Field(pattern="^(fall|near_miss|health|other)$")
    summary: str = Field(min_length=1, max_length=500)


class IncidentUpdate(BaseModel):
    status: str = Field(pattern="^(open|tracking|closed)$")


class FlagUpdate(BaseModel):
    status: str = Field(pattern="^(open|reviewed)$")


class FlagEdit(BaseModel):
    kind: str = Field(pattern="^(falls|health|safeguarding|sleep|nutrition)$")
    title: str = Field(min_length=1, max_length=180)
    why: str = Field(min_length=1, max_length=800)


class ActionIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    resident_id: str = Field(alias="residentId", min_length=1)
    title: str = Field(min_length=1, max_length=240)
    assignee: str = Field(default="", max_length=80)
    detail: str = Field(default="", max_length=2000)
    flag_id: str = Field(default="", alias="flagId", max_length=80)
    incident_id: str = Field(default="", alias="incidentId", max_length=80)


class ActionUpdate(BaseModel):
    status: str = Field(pattern="^(open|done)$")


class ActionAdviceIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    flag_ids: list[str] = Field(default_factory=list, alias="flagIds", max_length=8)
    incident_ids: list[str] = Field(default_factory=list, alias="incidentIds", max_length=8)


class ActionAdviceItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str
    detail: str
    points: list[str] = Field(default_factory=list)
    flag_id: str = Field(default="", serialization_alias="flagId")
    incident_id: str = Field(default="", serialization_alias="incidentId")


class ActionAdviceOut(BaseModel):
    actions: list[ActionAdviceItem]


class HandoverAdviceOut(BaseModel):
    advice: str


class ShiftUpdate(BaseModel):
    draft: str = Field(min_length=1, max_length=8000)


class SettingUpdate(BaseModel):
    value: str = Field(min_length=1, max_length=240)
