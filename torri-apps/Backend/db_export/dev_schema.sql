--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: dev; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA dev;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_master_users; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.admin_master_users (
    id character varying(36) NOT NULL,
    email character varying(120) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    role public.admin_master_users_role_enum NOT NULL,
    full_name character varying(100),
    is_active boolean
);


--
-- Name: alembic_version; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: app_settings; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.app_settings (
    id character varying(36) NOT NULL,
    key character varying(100) NOT NULL,
    value text NOT NULL,
    description character varying(255),
    data_type public.app_settings_data_type_enum DEFAULT 'string'::public.app_settings_data_type_enum NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: appointment_groups; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.appointment_groups (
    id uuid NOT NULL,
    client_id uuid NOT NULL,
    total_duration_minutes integer NOT NULL,
    total_price numeric(10,2) NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    status public.appointment_groups_status_enum NOT NULL,
    notes_by_client text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: appointments; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.appointments (
    id uuid NOT NULL,
    client_id uuid NOT NULL,
    professional_id uuid NOT NULL,
    service_id uuid NOT NULL,
    appointment_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    status public.appointments_status_enum NOT NULL,
    price_at_booking numeric(10,2) NOT NULL,
    paid_manually boolean NOT NULL,
    notes_by_client character varying(500),
    notes_by_professional character varying(500),
    group_id uuid
);


--
-- Name: companies; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.companies (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    logo_url character varying(500),
    contact_email character varying(255),
    contact_phone character varying(20),
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: professional_availability; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.professional_availability (
    id uuid NOT NULL,
    professional_user_id uuid NOT NULL,
    day_of_week public.professional_availability_day_enum NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL
);


--
-- Name: professional_blocked_time; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.professional_blocked_time (
    id uuid NOT NULL,
    professional_user_id uuid NOT NULL,
    tenant_id character varying(36),
    blocked_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    reason character varying(255),
    block_type public.professional_blocked_time_block_type_enum DEFAULT 'other'::public.professional_blocked_time_block_type_enum NOT NULL
);


--
-- Name: professional_breaks; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.professional_breaks (
    id uuid NOT NULL,
    professional_user_id uuid NOT NULL,
    tenant_id character varying(36),
    day_of_week public.professional_availability_day_enum NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    name character varying(100)
);


--
-- Name: service_categories; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.service_categories (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    tenant_id character varying(36),
    display_order integer DEFAULT 0 NOT NULL,
    icon_path character varying(255)
);


--
-- Name: service_professionals_association; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.service_professionals_association (
    service_id uuid NOT NULL,
    professional_user_id uuid NOT NULL
);


--
-- Name: service_station_requirements; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.service_station_requirements (
    service_id uuid NOT NULL,
    station_type_id uuid NOT NULL,
    qty integer DEFAULT 1 NOT NULL
);


--
-- Name: services; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.services (
    id uuid NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    duration_minutes integer NOT NULL,
    price numeric(10,2) NOT NULL,
    commission_percentage numeric(5,2),
    category_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    image_liso character varying(255),
    image_ondulado character varying(255),
    image_cacheado character varying(255),
    image_crespo character varying(255),
    image character varying(255),
    parallelable boolean DEFAULT false NOT NULL,
    max_parallel_pros integer DEFAULT 1 NOT NULL
);


--
-- Name: station_types; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.station_types (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL
);


--
-- Name: stations; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.stations (
    id uuid NOT NULL,
    type_id uuid NOT NULL,
    label character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: tenants; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.tenants (
    id character varying(36) NOT NULL,
    name character varying(120) NOT NULL,
    slug character varying(50) NOT NULL,
    db_schema_name character varying(100),
    logo_url character varying(500),
    primary_color character varying(7),
    block_size_minutes integer NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: dev; Owner: -
--

CREATE TABLE dev.users (
    id uuid NOT NULL,
    tenant_id character varying(36),
    email character varying(120) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    role public.users_role_enum NOT NULL,
    full_name character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    photo_path character varying(500),
    phone_number character varying(20),
    date_of_birth date,
    hair_type public.users_hair_type_enum,
    gender public.users_gender_enum
);


--
-- Name: admin_master_users admin_master_users_email_key; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.admin_master_users
    ADD CONSTRAINT admin_master_users_email_key UNIQUE (email);


--
-- Name: admin_master_users admin_master_users_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.admin_master_users
    ADD CONSTRAINT admin_master_users_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.alembic_version
    ADD CONSTRAINT alembic_version_pkey PRIMARY KEY (version_num);


--
-- Name: app_settings app_settings_key_key; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.app_settings
    ADD CONSTRAINT app_settings_key_key UNIQUE (key);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: appointment_groups appointment_groups_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.appointment_groups
    ADD CONSTRAINT appointment_groups_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: professional_availability professional_availability_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.professional_availability
    ADD CONSTRAINT professional_availability_pkey PRIMARY KEY (id);


--
-- Name: professional_blocked_time professional_blocked_time_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.professional_blocked_time
    ADD CONSTRAINT professional_blocked_time_pkey PRIMARY KEY (id);


--
-- Name: professional_breaks professional_breaks_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.professional_breaks
    ADD CONSTRAINT professional_breaks_pkey PRIMARY KEY (id);


--
-- Name: service_categories service_categories_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.service_categories
    ADD CONSTRAINT service_categories_pkey PRIMARY KEY (id);


--
-- Name: service_professionals_association service_professionals_association_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.service_professionals_association
    ADD CONSTRAINT service_professionals_association_pkey PRIMARY KEY (service_id, professional_user_id);


--
-- Name: service_station_requirements service_station_requirements_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.service_station_requirements
    ADD CONSTRAINT service_station_requirements_pkey PRIMARY KEY (service_id, station_type_id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: station_types station_types_code_key; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.station_types
    ADD CONSTRAINT station_types_code_key UNIQUE (code);


--
-- Name: station_types station_types_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.station_types
    ADD CONSTRAINT station_types_pkey PRIMARY KEY (id);


--
-- Name: stations stations_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.stations
    ADD CONSTRAINT stations_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_db_schema_name_key; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.tenants
    ADD CONSTRAINT tenants_db_schema_name_key UNIQUE (db_schema_name);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: dev; Owner: -
--

ALTER TABLE ONLY dev.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: appointment_groups_client_id_idx; Type: INDEX; Schema: dev; Owner: -
--

CREATE INDEX appointment_groups_client_id_idx ON dev.appointment_groups USING btree (client_id);


--
-- Name: appointment_groups_start_time_idx; Type: INDEX; Schema: dev; Owner: -
--

CREATE INDEX appointment_groups_start_time_idx ON dev.appointment_groups USING btree (start_time);


--
-- Name: appointment_groups_status_idx; Type: INDEX; Schema: dev; Owner: -
--

CREATE INDEX appointment_groups_status_idx ON dev.appointment_groups USING btree (status);


--
-- Name: appointments_professional_id_idx; Type: INDEX; Schema: dev; Owner: -
--

CREATE INDEX appointments_professional_id_idx ON dev.appointments USING btree (professional_id);


--
-- Name: appointments_service_id_idx; Type: INDEX; Schema: dev; Owner: -
--

CREATE INDEX appointments_service_id_idx ON dev.appointments USING btree (service_id);


--
-- Name: companies_name_idx; Type: INDEX; Schema: dev; Owner: -
--

CREATE INDEX companies_name_idx ON dev.companies USING btree (name);


--
-- Name: professional_availability_professional_user_id_day_of_week_idx; Type: INDEX; Schema: dev; Owner: -
--

CREATE INDEX professional_availability_professional_user_id_day_of_week_idx ON dev.professional_availability USING btree (professional_user_id, day_of_week);


--
-- Name: professional_blocked_time_professional_user_id_blocked_date_idx; Type: INDEX; Schema: dev; Owner: -
--

CREATE INDEX professional_blocked_time_professional_user_id_blocked_date_idx ON dev.professional_blocked_time USING btree (professional_user_id, blocked_date);


--
-- Name: professional_breaks_professional_user_id_day_of_week_idx; Type: INDEX; Schema: dev; Owner: -
--

CREATE INDEX professional_breaks_professional_user_id_day_of_week_idx ON dev.professional_breaks USING btree (professional_user_id, day_of_week);


--
-- Name: service_professionals_association_professional_user_id_idx; Type: INDEX; Schema: dev; Owner: -
--

CREATE INDEX service_professionals_association_professional_user_id_idx ON dev.service_professionals_association USING btree (professional_user_id);


--
-- Name: services_category_id_idx; Type: INDEX; Schema: dev; Owner: -
--

CREATE INDEX services_category_id_idx ON dev.services USING btree (category_id);


--
-- Name: stations_type_id_idx; Type: INDEX; Schema: dev; Owner: -
--

CREATE INDEX stations_type_id_idx ON dev.stations USING btree (type_id);


--
-- Name: users_email_idx; Type: INDEX; Schema: dev; Owner: -
--

CREATE UNIQUE INDEX users_email_idx ON dev.users USING btree (email);


--
-- PostgreSQL database dump complete
--

