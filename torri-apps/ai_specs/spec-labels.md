# Project: Hair Type Field to Labels Migration

## Executive Summary
Replace the existing "Tipo de Cabelo" (Hair Type) field with a flexible labeling system that allows clients to add multiple descriptive tags for styling preferences and personal characteristics.

## Current State
- **Web-admin**: CRUD interface for Clients with "Tipo de Cabelo" field
- **App-client**: Profile screen displaying "Tipo de Cabelo" field with edit functionality
- **Backend**: Python models and database schema supporting the hair type field

## Target State
- Complete removal of "Tipo de Cabelo" field from all systems
- Implementation of a flexible labeling system for client preferences
- Intuitive UX for label management in both Web-admin and App-client

on the Web-admin we have the crud of Clients, where it has the field Tipo de Cabelo.
  we will remove completely the impleementation from this field from the front end on the Web-admin, from the models in python and database.
  also need to remove from the App-client, there is the Profile of the user with this field, and also a screen to edit. 
  remove completetly.
  then we will add to the CRUD of the client in the Web-admin, the labels, where it will be possible to add labels like (moreno, liso, loiro, etc)
  so tthat the client can add different labels for their style (but that is not only for hair style, can be anything related to their preferences, 
  need to think about a good name to describe this from the client perspective and UX perspective)\
  also need to add this labels to the App-client in the Profile screen, and to edit. it needs to have a easy and good UX pratice to the users do it 
  intuitively and easy.
  #your task#
  after reading the context and goal above, you can act now as an UX designer and software architect to create a plan with berakdown in tasks to execute and achieve the given goal.
  for each task you have to create a prompt and save in a file in the folder torri-apps/ai_specs/
  #important# for each prompt need to have: the context of the task, the goal, what needs to be done in the task, the output, technical details, validation steps